import { Object3D, Mesh, Material, Texture } from 'three';

export function disposeScene(root: Object3D) {
  if (!root) return;
  root.traverse((obj) => {
    if (obj instanceof Mesh) {
      if (obj.geometry) {
        obj.geometry.dispose();
      }
      if (obj.material) {
        const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
        materials.forEach((mat: Material) => {
          Object.values(mat).forEach((value) => {
            if (value && value instanceof Texture) {
              value.dispose();
            }
          });
          mat.dispose();
        });
      }
    }
  });
}
