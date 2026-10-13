import { useEffect, useState } from "react";
import { continueRender, delayRender, staticFile } from "remotion";
import * as THREE from "three";

const cache = new Map<string, Promise<THREE.Texture>>();

/**
 * Charge une texture depuis public/ (staticFile) en bloquant le rendu jusqu'au chargement,
 * pour un rendu image par image reproductible.
 */
export const useStaticTexture = (publicPath: string, opts?: { srgb?: boolean; anisotropy?: number }) => {
  const [tex, setTex] = useState<THREE.Texture | null>(null);
  const [handle] = useState(() => delayRender(`Texture ${publicPath}`));
  useEffect(() => {
    let p = cache.get(publicPath);
    if (!p) {
      p = new THREE.TextureLoader().loadAsync(staticFile(publicPath));
      cache.set(publicPath, p);
    }
    p.then((t) => {
      if (opts?.srgb !== false) t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = opts?.anisotropy ?? 8;
      t.needsUpdate = true;
      setTex(t);
      continueRender(handle);
    }).catch((e) => {
      console.error(e);
      continueRender(handle);
    });
  }, [publicPath, handle, opts?.srgb, opts?.anisotropy]);
  return tex;
};
