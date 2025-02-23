'use client';

import { useEffect, useRef } from 'react';

interface TechnoConfettiProps {
  isActive: boolean;
  sourceElement: HTMLElement | null;
}

const TechnoConfetti = ({ isActive, sourceElement }: TechnoConfettiProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!isActive || !canvasRef.current || !sourceElement) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const updateSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    updateSize();
    window.addEventListener('resize', updateSize);

    // Get button position
    const buttonRect = sourceElement.getBoundingClientRect();
    const buttonCenter = {
      x: buttonRect.left + buttonRect.width / 2,
      y: buttonRect.top + buttonRect.height / 2
    };

    class Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      color: string;
      size: number;
      life: number;
      fadeOut: boolean;
      fadeSpeed: number;

      constructor() {
        // Start from behind the button
        this.x = buttonCenter.x;
        this.y = buttonCenter.y;
        const angle = (Math.random() * Math.PI) - (Math.PI / 2);
        const velocity = 5 + Math.random() * 7;
        this.vx = Math.cos(angle) * velocity;
        this.vy = Math.sin(angle) * velocity - 4;
        this.color = Math.random() > 0.5 ? '#00F0FF' : '#FF00B8';
        this.size = 2 + Math.random() * 3;
        this.life = 1;
        this.fadeOut = false;
        this.fadeSpeed = 0.02;
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.2;
        
        // Only decrease life if fadeOut is true
        if (this.fadeOut) {
          this.life -= this.fadeSpeed;
        }
      }

      draw() {
        if (!ctx) return;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.globalAlpha = this.life;
        ctx.fill();
        
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 15;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }

    const particles: Particle[] = [];
    let animationFrame: number;
    let isEmitting = true;

    // Stop emitting new particles after 3 seconds
    setTimeout(() => {
      isEmitting = false;
    }, 3000);

    // Start fade out after 3 seconds
    setTimeout(() => {
      particles.forEach(particle => {
        particle.fadeOut = true;
      });
    }, 3000);

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Add new particles while emitting
      if (isEmitting && particles.length < 200) {
        for (let i = 0; i < 5; i++) {
          particles.push(new Particle());
        }
      }

      // Update and draw particles
      for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        particles[i].draw();
        
        if (particles[i].life <= 0) {
          particles.splice(i, 1);
        }
      }

      if (particles.length > 0) {
        animationFrame = requestAnimationFrame(animate);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrame);
      window.removeEventListener('resize', updateSize);
      if (canvas && ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };
  }, [isActive, sourceElement]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-50"
    />
  );
};

export default TechnoConfetti; 