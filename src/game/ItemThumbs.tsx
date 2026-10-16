// Ảnh thật cho cửa hàng: dựng mô hình 3D của từng món trong 1 khung vẽ ẩn và chụp lại thành ảnh.
import { Suspense, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { ItemModel } from "./Models";
import { CATALOG, type CatalogItem } from "./catalog";
import { gardenGoods } from "@/lib/neighborhood";

const cache = new Map<string, string>();
const failed = new Set<string>();
const queue: string[] = [];
const listeners = new Set<() => void>();
let version = 0;
const emit = () => { version++; listeners.forEach((l) => l()); };
const subscribe = (l: () => void) => { listeners.add(l); return () => listeners.delete(l); };

function request(id: string) {
  if (cache.has(id) || failed.has(id) || queue.includes(id)) return;
  queue.push(id);
  emit();
}

const SKIP_KINDS = new Set(["brick", "concrete", "rooftile", "palette", "paint"]);

export function ItemThumb({ item, className = "" }: { item: CatalogItem; className?: string }) {
  useSyncExternalStore(subscribe, () => version, () => 0);
  const skip = SKIP_KINDS.has(item.kind ?? "place") || gardenGoods.some(g => g.id === item.id);
  useEffect(() => { if (!skip) request(item.id); }, [item.id, skip]);
  const src = cache.get(item.id);
  if (src) return <img src={src} alt={item.name} loading="lazy" draggable={false} className={`object-contain ${className}`} />;
  return (
    <span className={`flex items-center justify-center ${!skip && !failed.has(item.id) ? "animate-pulse opacity-60" : ""} ${className}`}>
      {item.icon}
    </span>
  );
}

function Shot({ item, onDone }: { item: CatalogItem; onDone: (url: string | null) => void }) {
  const group = useRef<THREE.Group>(null);
  const { gl, camera, scene } = useThree();
  const frames = useRef(0);
  const done = useRef(false);
  useLayoutEffect(() => { frames.current = 0; done.current = false; }, [item.id]);
  useFrame(() => {
    if (done.current || !group.current) return;
    frames.current++;
    if (frames.current === 2) {
      const box = new THREE.Box3().setFromObject(group.current);
      if (box.isEmpty()) return;
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      const r = Math.max(size.x, size.y, size.z) * 0.5 || 1;
      const cam = camera as THREE.PerspectiveCamera;
      const dist = (r / Math.sin((cam.fov * Math.PI) / 360)) * 1.05;
      const dir = new THREE.Vector3(0.75, 0.55, 1).normalize();
      cam.position.copy(center).addScaledVector(dir, dist);
      cam.near = dist / 100; cam.far = dist * 10;
      cam.lookAt(center);
      cam.updateProjectionMatrix();
    }
    if (frames.current === 4) {
      done.current = true;
      gl.render(scene, camera);
      try { onDone(gl.domElement.toDataURL("image/webp", 0.85)); } catch { onDone(null); }
    }
  });
  return (
    <group ref={group}>
      <ItemModel item={item} />
    </group>
  );
}

/** Đặt 1 lần khi cửa hàng mở; tự chụp các món đang được yêu cầu. */
export function ThumbnailBaker() {
  useSyncExternalStore(subscribe, () => version, () => 0);
  const [current, setCurrent] = useState<CatalogItem | null>(null);
  useEffect(() => {
    if (current || !queue.length) return;
    const id = queue[0];
    const it = CATALOG.find((c) => c.id === id);
    if (!it) { queue.shift(); failed.add(id); emit(); return; }
    setCurrent(it);
  });
  useEffect(() => {
    if (!current) return;
    const t = setTimeout(() => finish(null), 4000); // món nào lỗi thì bỏ qua
    return () => clearTimeout(t);
  }, [current]);
  const finish = (url: string | null) => {
    if (!current) return;
    const id = current.id;
    queue.splice(queue.indexOf(id), 1);
    if (url) cache.set(id, url); else failed.add(id);
    setCurrent(null);
    emit();
  };
  if (!current && !queue.length) return null;
  return (
    <div aria-hidden style={{ position: "fixed", left: -9999, top: 0, width: 256, height: 256, pointerEvents: "none" }}>
      <Canvas
        dpr={1}
        gl={{ preserveDrawingBuffer: true, alpha: true, antialias: true }}
        camera={{ fov: 30, position: [4, 3, 5] }}
        frameloop="always"
        style={{ width: 256, height: 256 }}
      >
        <ambientLight intensity={0.9} />
        <hemisphereLight args={["#ffffff", "#b59a6a", 0.8]} />
        <directionalLight position={[5, 8, 6]} intensity={1.6} />
        <directionalLight position={[-6, 3, -2]} intensity={0.5} />
        <Suspense fallback={null}>
          {current && <Shot key={current.id} item={current} onDone={finish} />}
        </Suspense>
      </Canvas>
    </div>
  );
}

export function matchItem(it: CatalogItem, q: string, label: string) {
  const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/gi, "d").toLowerCase();
  const n = norm(q.trim());
  if (!n) return true;
  return norm(it.name).includes(n) || norm(label).includes(n) || norm(it.id).includes(n) || norm(it.category).includes(n);
}
