'use client';

import { useEffect, useRef } from 'react';

interface WaveDisturbance {
  x: number;
  intensity: number;
  time: number;
}

interface AnimatedBackgroundProps {
  inputPosition?: { top: number; height: number };
}

const AnimatedBackground = ({ inputPosition }: AnimatedBackgroundProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const disturbancesRef = useRef<WaveDisturbance[]>([]);
  const mouseRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const setCanvasSize = () => {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
    };
    setCanvasSize();
    window.addEventListener('resize', setCanvasSize);

    // Track mouse position
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('mousemove', handleMouseMove);

    // Handle wave interactions
    const handleWaveInteraction = (event: CustomEvent) => {
      const { intensity } = event.detail;
      disturbancesRef.current.push({
        x: window.innerWidth / 2, // Always start from center
        intensity: intensity * 0.8, // Less reduction in intensity
        time: Date.now(),
      });
    };

    window.addEventListener('waveInteraction', handleWaveInteraction as EventListener);

    // Particle system
    const particles: Particle[] = [];
    const particleCount = 30;

    class Particle {
      x: number;
      y: number;
      size: number;
      baseSize: number;
      angle: number;
      speedX: number;
      speedY: number;
      opacity: number;
      rotationSpeed: number;

      constructor(canvasWidth: number, canvasHeight: number) {
        this.x = Math.random() * canvasWidth;
        this.y = Math.random() * canvasHeight;
        this.baseSize = Math.random() * 3 + 2;
        this.size = this.baseSize;
        this.angle = Math.random() * Math.PI * 2;
        this.speedX = (Math.random() - 0.5) * 1;
        this.speedY = (Math.random() - 0.5) * 1;
        this.opacity = Math.random() * 0.5 + 0.2;
        this.rotationSpeed = (Math.random() - 0.5) * 0.02;
      }

      update(canvasWidth: number, canvasHeight: number, mouseX: number, mouseY: number) {
        // Basic movement
        this.x += this.speedX;
        this.y += this.speedY;
        this.angle += this.rotationSpeed;

        // Mouse interaction
        const dx = mouseX - this.x;
        const dy = mouseY - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const mouseInfluenceRadius = 100;

        if (distance < mouseInfluenceRadius) {
          const influence = (mouseInfluenceRadius - distance) / mouseInfluenceRadius;
          this.size = this.baseSize * (1 + influence);
          this.opacity = Math.min(0.8, this.opacity + influence * 0.3);
          
          // Gentle push away from mouse
          this.x += (dx / distance) * influence * -0.5;
          this.y += (dy / distance) * influence * -0.5;
        } else {
          this.size = this.baseSize;
          this.opacity = Math.max(0.2, this.opacity - 0.01);
        }

        // Screen wrapping
        if (this.x > canvasWidth) this.x = 0;
        if (this.x < 0) this.x = canvasWidth;
        if (this.y > canvasHeight) this.y = 0;
        if (this.y < 0) this.y = canvasHeight;
      }

      drawEnvelope(ctx: CanvasRenderingContext2D) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        
        const width = this.size * 4;
        const height = this.size * 2.5;
        
        ctx.fillStyle = `rgba(0, 240, 255, ${this.opacity})`;
        ctx.strokeStyle = `rgba(0, 240, 255, ${this.opacity * 1.2})`;
        ctx.lineWidth = 0.5;

        // Draw envelope body
        ctx.beginPath();
        ctx.rect(-width/2, -height/2, width, height);
        ctx.fill();
        ctx.stroke();

        // Draw envelope flap
        ctx.beginPath();
        ctx.moveTo(-width/2, -height/2);
        ctx.lineTo(0, 0);
        ctx.lineTo(width/2, -height/2);
        ctx.stroke();

        ctx.restore();
      }
    }

    // Initialize particles
    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle(canvas.width, canvas.height));
    }

    // Modified animation loop with wave disturbances
    const animate = () => {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw wave pattern with disturbances
      const currentTime = Date.now() * 0.001;
      
      // Enhanced glow effect
      ctx.shadowBlur = 20;
      ctx.shadowColor = 'rgba(0, 240, 255, 0.8)';
      ctx.lineWidth = 4;

      // Calculate wave center position
      const waveY = inputPosition ? 
        inputPosition.top + (inputPosition.height / 2) : 
        canvas.height / 2;

      // Clean up old disturbances
      disturbancesRef.current = disturbancesRef.current.filter(
        d => Date.now() - d.time < 2000
      );

      // Draw base wave
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.5)'; // Increased opacity

      for (let i = 0; i < canvas.width; i += 3) {
        let y = Math.sin(i * 0.005 + currentTime) * 25 + waveY; // Increased amplitude

        // Apply all active disturbances
        disturbancesRef.current.forEach(disturbance => {
          const timeFactor = 1 - (Date.now() - disturbance.time) / 2000;
          const distance = Math.abs(i - disturbance.x);
          const disturbanceEffect = 
            Math.sin(distance * 0.02 + (Date.now() - disturbance.time) * 0.002) * 
            Math.exp(-distance * 0.001) * // Less falloff
            disturbance.intensity * 
            timeFactor * 
            40; // Increased amplitude
          y += disturbanceEffect;
        });

        if (i === 0) {
          ctx.moveTo(i, y);
        } else {
          ctx.lineTo(i, y);
        }
      }
      ctx.stroke();

      // Draw an additional layer for extra glow
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.2)';
      ctx.lineWidth = 8;
      for (let i = 0; i < canvas.width; i += 3) {
        const y = Math.sin(i * 0.005 + currentTime) * 25 + waveY;
        if (i === 0) {
          ctx.moveTo(i, y);
        } else {
          ctx.lineTo(i, y);
        }
      }
      ctx.stroke();

      // Update and draw particles
      particles.forEach(particle => {
        particle.update(canvas.width, canvas.height, mouseRef.current.x, mouseRef.current.y);
        particle.drawEnvelope(ctx);
      });

      requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', setCanvasSize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('waveInteraction', handleWaveInteraction as EventListener);
    };
  }, [inputPosition]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed top-0 left-0 h-screen w-screen bg-charcoal"
      style={{ zIndex: -1 }}
    />
  );
};

export default AnimatedBackground; 