import * as THREE from 'three'
import { PALETTE } from './Palette.js'

const SUN_DIR = new THREE.Vector3(-40, 25, 30).normalize()
const SHADOW_TINT = new THREE.Color(PALETTE.shadowCool)
const RIM_COLOR = new THREE.Color(PALETTE.rimWarm)

const RAMP_GLSL = /* glsl */ `
float toonRamp(float NdotL) {
  if (NdotL < 0.25) return 0.251;
  if (NdotL < 0.5)  return 0.502;
  if (NdotL < 0.75) return 0.745;
  return 1.0;
}
`

const SHADOW_TINT_GLSL = /* glsl */ `
vec3 applyShadowTint(vec3 color, float shadow) {
  vec3 tint = uShadowTint;
  return mix(color, color * tint, (1.0 - shadow) * 0.4);
}
`

const RIM_GLSL = /* glsl */ `
vec3 applyRimLight(vec3 color, vec3 normal, vec3 viewDir, float NdotSun) {
  float rim = 1.0 - max(dot(normal, viewDir), 0.0);
  rim = smoothstep(0.5, 0.6, rim);
  float sunGate = step(0.3, NdotSun);
  color += uRimColor * rim * sunGate * 0.6;
  return color;
}
`

const SPECULAR_GLSL = /* glsl */ `
vec3 applySteppedSpecular(vec3 color, vec3 normal, vec3 viewDir, vec3 lightDir) {
  if (uSpecularEnabled < 0.5) return color;
  vec3 halfVec = normalize(lightDir + viewDir);
  float spec = dot(normal, halfVec);
  float stepped = step(0.98, spec);
  color += vec3(1.0) * stepped * 0.4;
  return color;
}
`

export function patchToonShader(
  material: THREE.MeshToonMaterial,
  opts: { specular?: boolean } = {}
): void {
  const specular = opts.specular || false

  material.onBeforeCompile = (shader) => {
    shader.uniforms.uSunDir = { value: SUN_DIR }
    shader.uniforms.uShadowTint = { value: SHADOW_TINT }
    shader.uniforms.uRimColor = { value: RIM_COLOR }
    shader.uniforms.uSpecularEnabled = { value: specular ? 1.0 : 0.0 }

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <common>',
      /* glsl */ `
      #include <common>
      uniform vec3 uSunDir;
      uniform vec3 uShadowTint;
      uniform vec3 uRimColor;
      uniform float uSpecularEnabled;
      ${RAMP_GLSL}
      ${SHADOW_TINT_GLSL}
      ${RIM_GLSL}
      ${SPECULAR_GLSL}
      `
    )

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <output_fragment>',
      /* glsl */ `
      vec3 viewDirection = normalize(vViewPosition);
      vec3 worldNormal = normalize(vNormal);
      float NdotSun = dot(worldNormal, uSunDir);
      float ramp = toonRamp(max(NdotSun, 0.0));

      outgoingLight *= ramp;
      outgoingLight = applyShadowTint(outgoingLight, ramp);
      outgoingLight = applyRimLight(outgoingLight, worldNormal, viewDirection, NdotSun);
      outgoingLight = applySteppedSpecular(outgoingLight, worldNormal, viewDirection, uSunDir);

      #include <output_fragment>
      `
    )
  }
}
