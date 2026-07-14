import * as THREE from 'three'

const canvas = document.querySelector('.js-canvas')
const loadingEl = document.querySelector('.js-loading')
const loadingBar = document.querySelector('.js-loading-bar')

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x0a0a0a)

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100)
camera.position.set(0, 0, 5)

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

const geometry = new THREE.IcosahedronGeometry(1, 1)
const material = new THREE.MeshBasicMaterial({ color: 0x00ff41, wireframe: true })
const mesh = new THREE.Mesh(geometry, material)
scene.add(mesh)

loadingBar.style.width = '100%'
setTimeout(() => {
  loadingEl.classList.add('is-hidden')
}, 400)

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
})

function animate() {
  requestAnimationFrame(animate)
  mesh.rotation.x += 0.005
  mesh.rotation.y += 0.01
  renderer.render(scene, camera)
}

animate()

window.__game = { loadState: 'ready' }
document.dispatchEvent(new Event('load-complete'))
