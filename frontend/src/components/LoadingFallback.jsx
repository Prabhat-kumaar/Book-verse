import React from 'react'

export default function LoadingFallback() {
    return (
        <div className="grid min-h-screen place-items-center bg-[#050914] text-slate-200">
            <div className="flex flex-col items-center gap-4 p-6 rounded-3xl border border-white/10 bg-slate-950/80 shadow-2xl shadow-black/20">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/10 border-t-indigo-400" role="status" aria-label="Loading" />
                <div className="space-y-2 text-center">
                    <p className="text-sm font-semibold tracking-[0.2em] text-indigo-300 uppercase">Loading content</p>
                    <p className="max-w-xs text-xs text-slate-400">This page is loading a fast, optimized chunk for your current route.</p>
                </div>
            </div>
        </div>
    )
}
