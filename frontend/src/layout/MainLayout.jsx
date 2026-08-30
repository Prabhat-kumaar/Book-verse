import React, { useState } from 'react'
import { useLocation } from 'react-router-dom'
import AppSidebar from '../components/AppSidebar'
import AppTopBar from '../components/AppTopBar'

export default function MainLayout({ children, hideChrome = false, fullBleed = false }) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  if (hideChrome) {
    return (
      <div className="min-h-screen w-full bg-[#0b0d17] text-white">
        <main className="w-full">{children}</main>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen bg-[#090b14] text-slate-100 flex">
      {/* Left Sidebar */}
      <AppSidebar
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      {/* Main Content Area (Offset by Sidebar on Desktop) */}
      <div className="flex-1 flex flex-col min-w-0 md:pl-64">
        {/* Top Search & Actions Bar */}
        <AppTopBar onOpenMobileSidebar={() => setMobileSidebarOpen(true)} />

        {/* Page Canvas */}
        <main className={`flex-1 w-full ${fullBleed ? '' : 'p-4 sm:p-6 md:p-8 max-w-[1600px] mx-auto'}`}>
          {children}
        </main>
      </div>
    </div>
  )
}

