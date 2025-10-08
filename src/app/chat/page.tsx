'use client'

import React, { useState } from 'react'
import ChatInterface from '../../components/ChatInterface'

export default function ChatPage() {
  const [userId] = useState('demo-user-123') // In real app, get from auth

  return (
    <div className="h-screen overflow-hidden">
      <ChatInterface userId={userId} />
    </div>
  )
}