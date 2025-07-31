"use client"

import Hero from './Hero';
import React from 'react'
import Beams from './Beams';
import RippleGrid from './RippleGrid';




export default function HomeCom() {
  return (
    <div>
          <Hero />
          <div className="w-full h-full absolute top-0 left-0 ">
<div style={{position: 'relative', height: '100%', overflow: 'hidden'}}>
  <RippleGrid
    enableRainbow={true}
    gridColor="#ff3030"
    rippleIntensity={0.2}
    gridSize={17}
    gridThickness={2}
    mouseInteraction={true}
    mouseInteractionRadius={1.2}
    opacity={0.8}
  />
</div>
          </div>

</div>
  )
}