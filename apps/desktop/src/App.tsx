import React from 'react'
import AppShell from '../../web/src/app/AppShell.jsx'
import { UpdateBanner, WindowControls } from './components/UpdateBanner'

export default function App() {
  return (
    <>
      <div className="desktop-drag-region" />
      <WindowControls />
      <UpdateBanner />
      <AppShell />
    </>
  )
}
