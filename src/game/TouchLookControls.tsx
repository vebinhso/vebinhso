import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";

/**
 * Touch-only first-person look controls for r3f.
 * - Drag anywhere on the canvas (outside the joystick / jump button zones)
 *   to rotate the camera 360° on yaw and clamp pitch.
 * - No-op on desktop (PointerLockControls handles that case).
 *
 * Avoids the bottom-left (joystick, ~180x180) and bottom-right (jump button, ~180x180) zones.
 */
export function TouchLookControls({ sensitivity = 0.0035 }: { sensitivity?: number }) {
  const { camera, gl } = useThree();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const isTouch = window.matchMedia("(pointer: coarse)").matches;
    if (!isTouch) return;

    const dom = gl.domElement;
    camera.rotation.order = "YXZ";

    let activePointerId: number | null = null;
    let lastX = 0;
    let lastY = 0;
    const HALF_PI = Math.PI / 2 - 0.01;

    const inControlZone = (x: number, y: number) => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      // bottom-left joystick zone
      if (x < 180 && y > h - 200) return true;
      // bottom-right jump/action zone
      if (x > w - 180 && y > h - 220) return true;
      return false;
    };

    const onDown = (e: PointerEvent) => {
      if (activePointerId !== null) return;
      if (e.pointerType !== "touch") return;
      if (inControlZone(e.clientX, e.clientY)) return;
      activePointerId = e.pointerId;
      lastX = e.clientX;
      lastY = e.clientY;
      try { dom.setPointerCapture(e.pointerId); } catch {}
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerId !== activePointerId) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      const euler = new THREE.Euler().setFromQuaternion(camera.quaternion, "YXZ");
      euler.y -= dx * sensitivity;
      euler.x -= dy * sensitivity;
      euler.x = Math.max(-HALF_PI, Math.min(HALF_PI, euler.x));
      camera.quaternion.setFromEuler(euler);
    };

    const onUp = (e: PointerEvent) => {
      if (e.pointerId !== activePointerId) return;
      try { dom.releasePointerCapture(e.pointerId); } catch {}
      activePointerId = null;
    };

    dom.addEventListener("pointerdown", onDown);
    dom.addEventListener("pointermove", onMove);
    dom.addEventListener("pointerup", onUp);
    dom.addEventListener("pointercancel", onUp);
    dom.style.touchAction = "none";

    return () => {
      dom.removeEventListener("pointerdown", onDown);
      dom.removeEventListener("pointermove", onMove);
      dom.removeEventListener("pointerup", onUp);
      dom.removeEventListener("pointercancel", onUp);
    };
  }, [camera, gl, sensitivity]);

  return null;
}
