'use client'

import { Suspense } from 'react'
import { HomeContent } from '@/components/HomeContent'

export default function Home() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen bg-[#1e1e1e] text-white">Loading...</div>}>
      <HomeContent />
    </Suspense>
  )
} 
