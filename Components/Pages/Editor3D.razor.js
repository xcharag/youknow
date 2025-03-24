//import * as THREE from '/lib/three/three.module.js';
//import { OrbitControls } from '/lib/three/OrbitControls.js';
//import { GLTFLoader } from '/lib/three/GLTFLoader.js';
//import * as JSZip from '/lib/jszip/jszip.min.js';

import * as THREE from '../../wwwroot/lib/three/three.module.min.js';
import { OrbitControls } from '../../wwwroot/lib/three/OrbitControls.js';
import { GLTFLoader } from '../../wwwroot/lib/three/GLTFLoader.js';
import * as JSZip from '../../wwwroot/lib/jszip/jszip.min.js';

export class Editor3D {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, this.container.clientWidth / this.container.clientHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.controls = null;
        this.shirt = null;
        this.designTexture = null;
        this.shirtMaterial = null;
        this.designImage = null;

        this.init();
    }

    init() {
        // Setup renderer
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setClearColor(0x121212, 1);
        this.container.appendChild(this.renderer.domElement);

        // Setup camera
        this.camera.position.z = 3;

        // Add lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(0, 1, 1);
        this.scene.add(directionalLight);

        // Add camera controls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.1;
        this.controls.maxDistance = 5;
        this.controls.minDistance = 1.5;

        // Load shirt model
        this.loadShirtModel();

        // Start animation loop
        this.animate();

        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize());
    }

// Replace the loadShirtModel function with this implementation
    loadShirtModel() {
        // Load a T-shirt GLTF model
        const loader = new GLTFLoader();
        loader.load('/models/tshirt.glb', (gltf) => {
                this.shirt = gltf.scene;

                // Get the main mesh from the loaded model
                const tshirtMesh = this.shirt.getObjectByName('TShirt') ||
                    this.shirt.children.find(child => child.isMesh);

                if (tshirtMesh) {
                    // Store reference to the material
                    this.shirtMaterial = tshirtMesh.material;

                    // Set initial color
                    this.shirtMaterial.color.set(0xffffff);

                    // Position and scale the model correctly
                    this.shirt.position.set(0, 0, 0);
                    this.shirt.scale.set(1, 1, 1);
                }

                this.scene.add(this.shirt);
            },
            // Progress callback
            undefined,
            // Error callback
            (error) => {
                console.error('Error loading T-shirt model:', error);

                // Fallback to a basic placeholder if model fails to load
                const geometry = new THREE.BoxGeometry(1.5, 2, 0.2);
                this.shirtMaterial = new THREE.MeshStandardMaterial({
                    color: 0xffffff,
                    roughness: 0.8,
                    metalness: 0.2,
                });

                this.shirt = new THREE.Mesh(geometry, this.shirtMaterial);
                this.scene.add(this.shirt);
            });
    }

    setShirtColor(color) {
        if (this.shirt && this.shirtMaterial) {
            this.shirtMaterial.color.set(color);
        }
    }

    applyDesign(imageBase64) {
        if (!this.shirt) return;

        // Create a texture from the uploaded image
        const loader = new THREE.TextureLoader();
        const texture = loader.load(`data:image/png;base64,${imageBase64}`, () => {
            texture.flipY = false;
            texture.encoding = THREE.sRGBEncoding;

            // Save references
            this.designTexture = texture;
            this.designImage = imageBase64;

            // Find the mesh to apply the texture to
            let targetMesh;
            if (this.shirt.getObjectByName) {
                // If it's a loaded GLTF model
                targetMesh = this.shirt.getObjectByName('TShirt') ||
                    this.shirt.children.find(child => child.isMesh);
            } else {
                // If it's our fallback box
                targetMesh = this.shirt;
            }

            if (targetMesh) {
                // Clone the original material to keep its properties
                const designMaterial = targetMesh.material.clone();

                // Apply the texture to the material
                designMaterial.map = texture;

                // Store the original material if not already stored
                if (!this.originalMaterial) {
                    this.originalMaterial = targetMesh.material.clone();
                }

                // Apply the new material
                targetMesh.material = designMaterial;
            }
        });
    }

    updateDesignSettings(offsetX, offsetY, scale, rotation) {
        if (!this.designTexture) return;

        // Update texture offset and scale
        this.designTexture.offset.x = offsetX / 100;
        this.designTexture.offset.y = offsetY / 100;
        this.designTexture.repeat.x = scale / 100;
        this.designTexture.repeat.y = scale / 100;
        this.designTexture.rotation = rotation * Math.PI / 180;

        // Ensure the texture updates
        this.designTexture.needsUpdate = true;
    }

    rotateView(angle) {
        this.controls.rotateLeft(angle * Math.PI / 180);
    }

    zoomView(factor) {
        this.camera.position.z /= factor;
        this.controls.update();
    }

    resetDesign() {
        // Find the mesh to reset
        let targetMesh;
        if (this.shirt.getObjectByName) {
            // If it's a loaded GLTF model
            targetMesh = this.shirt.getObjectByName('TShirt') ||
                this.shirt.children.find(child => child.isMesh);
        } else {
            // If it's our fallback box
            targetMesh = this.shirt;
        }

        // Reset to original material if available
        if (targetMesh && this.originalMaterial) {
            targetMesh.material = this.originalMaterial.clone();
        }

        // Clear design references
        this.designTexture = null;
        this.designImage = null;
    }

    saveDesign() {
        // Capture the current canvas as image
        const dataUrl = this.renderer.domElement.toDataURL('image/png');

        // Create a zip file containing the design and configuration
        const zip = new JSZip();

        // Add the rendered image
        zip.file("design-preview.png", dataUrl.split('base64,')[1], {base64: true});

        // Add the original image if available
        if (this.designImage) {
            zip.file("design-image.png", this.designImage, {base64: true});
        }

        // Add design configuration as JSON
        const configuration = {
            shirtColor: this.shirtMaterial.color.getHexString(),
            design: {
                offsetX: this.designTexture ? this.designTexture.offset.x : 0,
                offsetY: this.designTexture ? this.designTexture.offset.y : 0,
                scale: this.designTexture ? this.designTexture.repeat.x : 0,
                rotation: this.designTexture ? this.designTexture.rotation : 0
            },
            timestamp: new Date().toISOString()
        };

        zip.file("design-config.json", JSON.stringify(configuration, null, 2));

        // Generate and download the zip
        zip.generateAsync({type:"blob"})
            .then(function(content) {
                const link = document.createElement('a');
                link.href = URL.createObjectURL(content);
                link.download = "tshirt-design.zip";
                link.click();
            });
    }

    onWindowResize() {
        this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
}

// Initialize the editor
export function initEditor(containerId) {
    return new Editor3D(containerId);
}

// Make globally available
window.Editor3D = Editor3D;
window.initEditor = initEditor;