import * as THREE from 'three'
import { PALETTE } from './Palette.js'

const vertexShader = /* glsl */ `
uniform float uTime;
varying vec2 vUv;
varying vec3 vWorldPos;

void main() {
  vUv = uv;
  vec3 pos = position;

  float wave1 = sin(pos.x * 0.8 + uTime * 1.2) * 0.06;
  float wave2 = cos(pos.z * 0.6 + uTime * 0.9) * 0.05;
  pos.y += wave1 + wave2;

  vWorldPos = (modelMatrix * vec4(pos, 1.0)).xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`

const fragmentShader = /* glsl */ `
uniform vec3 uShallow;
uniform vec3 uDeep;
uniform vec3 uFoam;
uniform float uTime;
varying vec2 vUv;
varying vec3 vWorldPos;

void main() {
  float depthFactor = smoothstep(0.0, 1.0, vUv.y);

  vec3 shallow = uShallow;
  vec3 deep = uDeep;
  vec3 color;

  if (depthFactor < 0.33) {
    color = shallow;
  } else if (depthFactor < 0.66) {
    color = mix(shallow, deep, 0.5);
  } else {
    color = deep;
  }

  float sparkle = sin(vWorldPos.x * 8.0 + uTime * 3.0) * cos(vWorldPos.z * 6.0 + uTime * 2.5);
  sparkle = step(0.985, sparkle) * 0.3;
  color += vec3(sparkle);

  gl_FragColor = vec4(color, 0.88);
}
`

export function createCanalWater(xMin, xMax, zMin, zMax, y = 0) {
  const width = xMax - xMin
  const depth = zMax - zMin
  const cx = (xMin + xMax) / 2
  const cz = (zMin + zMax) / 2

  const geometry = new THREE.PlaneGeometry(width, depth, 30, 8)
  geometry.rotateX(-Math.PI / 2)

  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uTime: { value: 0 },
      uShallow: { value: new THREE.Color(PALETTE.canalTeal) },
      uDeep: { value: new THREE.Color(PALETTE.canalDeep) },
      uFoam: { value: new THREE.Color(PALETTE.foamWhite) }
    },
    transparent: true,
    side: THREE.DoubleSide
  })

  const mesh = new THREE.Mesh(geometry, material)
  mesh.position.set(cx, y, cz)
  mesh.userData.outlineParameters = { thickness: 0, color: [0, 0, 0], alpha: 0 }

  return { mesh, material }
}
