<template>
  <div class="app-shell" @mousemove="onMouseMove">
    <canvas ref="bgCanvas" class="bg-canvas"></canvas>
    <div class="spotlight" :style="{ left: mouseX + 'px', top: mouseY + 'px' }"></div>
    <div class="app-content">
      <NuxtRouteAnnouncer />
      <NuxtPage />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const mouseX = ref(0)
const mouseY = ref(0)
const bgCanvas = ref<HTMLCanvasElement | null>(null)

function onMouseMove(e: MouseEvent) {
  mouseX.value = e.clientX
  mouseY.value = e.clientY
}

onMounted(() => {
  const canvas = bgCanvas.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  let w = canvas.width = window.innerWidth
  let h = canvas.height = window.innerHeight
  const particles: {x:number;y:number;vx:number;vy:number;r:number;a:number}[] = []
  const count = 80
  for (let i = 0; i < count; i++) {
    particles.push({ x: Math.random()*w, y: Math.random()*h, vx: (Math.random()-0.5)*0.3, vy: (Math.random()-0.5)*0.3, r: Math.random()*1.5+0.5, a: Math.random()*0.5+0.2 })
  }
  function resize() { w = canvas.width = window.innerWidth; h = canvas.height = window.innerHeight }
  window.addEventListener('resize', resize)
  function draw() {
    ctx.clearRect(0, 0, w, h)
    const g = ctx.createLinearGradient(0, 0, w, h)
    g.addColorStop(0, '#05050a')
    g.addColorStop(0.5, '#0a0f1a')
    g.addColorStop(1, '#05050a')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)
    for (const p of particles) {
      p.x += p.vx; p.y += p.vy
      if (p.x < 0) p.x = w; if (p.x > w) p.x = 0
      if (p.y < 0) p.y = h; if (p.y > h) p.y = 0
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(0, 220, 130, ' + p.a + ')'
      ctx.fill()
    }
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x
        const dy = particles[i].y - particles[j].y
        const dist = Math.sqrt(dx*dx + dy*dy)
        if (dist < 120) {
          ctx.strokeStyle = 'rgba(0, 220, 130, ' + (0.08 * (1 - dist/120)) + ')'
          ctx.lineWidth = 0.5
          ctx.beginPath()
          ctx.moveTo(particles[i].x, particles[i].y)
          ctx.lineTo(particles[j].x, particles[j].y)
          ctx.stroke()
        }
      }
    }
    requestAnimationFrame(draw)
  }
  draw()
})

useHead({
  link: [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap' },
  ],
})
</script>

<style>
.app-shell { position: relative; min-height: 100svh; overflow: hidden; background: #05050a; }
.bg-canvas { position: absolute; inset: 0; z-index: 0; }
.spotlight { position: absolute; width: 520px; height: 520px; margin-left: -260px; margin-top: -260px; border-radius: 50%; background: radial-gradient(circle, rgba(0, 220, 130, 0.18) 0%, rgba(0, 220, 130, 0.06) 35%, transparent 70%); /* taste-skill-ignore */ pointer-events: none; z-index: 1; mix-blend-mode: screen; }
.app-content { position: relative; z-index: 2; min-height: 100svh; }
</style>
