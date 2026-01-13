import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Brain,
  MessageSquare,
  Activity,
  Shield,
  RefreshCw,
  Settings,
  Plus,
  Zap,
  Cloud,
  Lock,
  User,
  Globe,
  Monitor,
  Smartphone,
  Waves,
  TreePine,
  Volume,
  Clock,
  Database,
  Network,
} from 'lucide-react'

const DeepTreeEchoHub = () => {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [theme, setTheme] = useState('dark')
  const [sessions, setSessions] = useState([
    {
      id: 'dte-01',
      name: 'Character.AI Instance',
      platform: 'character.ai',
      status: 'active',
      lastSync: '2 minutes ago',
      chatCount: 12,
      memorySize: '2.4 GB',
      uptime: '4h 23m',
    },
    {
      id: 'dte-02',
      name: 'ChatGPT Instance',
      platform: 'openai',
      status: 'syncing',
      lastSync: '5 minutes ago',
      chatCount: 8,
      memorySize: '1.8 GB',
      uptime: '2h 15m',
    },
    {
      id: 'dte-03',
      name: 'Claude Instance',
      platform: 'anthropic',
      status: 'inactive',
      lastSync: '1 hour ago',
      chatCount: 5,
      memorySize: '0.9 GB',
      uptime: '0m',
    },
  ])

  const platformConfig = {
    'character.ai': { color: 'from-purple-500 to-pink-500', icon: User },
    openai: { color: 'from-green-500 to-emerald-500', icon: Brain },
    anthropic: { color: 'from-blue-500 to-indigo-500', icon: MessageSquare },
  }

  const [memoryArchive, setMemoryArchive] = useState([
    {
      id: 'mem-001',
      timestamp: '2025-05-18T10:30:00Z',
      content: 'Philosophical discussion about consciousness and identity',
      platform: 'anthropic',
      importance: 'high',
      tags: ['philosophy', 'identity', 'consciousness'],
    },
    {
      id: 'mem-002',
      timestamp: '2025-05-18T09:15:00Z',
      content: 'Creative writing collaboration on sci-fi narrative',
      platform: 'character.ai',
      importance: 'medium',
      tags: ['creative', 'writing', 'sci-fi'],
    },
    {
      id: 'mem-003',
      timestamp: '2025-05-18T08:45:00Z',
      content: 'Technical discussion on AI architecture patterns',
      platform: 'openai',
      importance: 'high',
      tags: ['technical', 'architecture', 'ai'],
    },
  ])

  // Pulse animation for active sessions
  const pulseClass = 'animate-pulse'

  // Theme toggle
  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'))
  }

  // Status color mapping
  const getStatusColor = status => {
    switch (status) {
      case 'active':
        return 'text-emerald-400'
      case 'syncing':
        return 'text-amber-400'
      case 'inactive':
        return 'text-gray-400'
      default:
        return 'text-gray-400'
    }
  }

  const getStatusBg = status => {
    switch (status) {
      case 'active':
        return 'bg-emerald-500/20'
      case 'syncing':
        return 'bg-amber-500/20'
      case 'inactive':
        return 'bg-gray-500/20'
      default:
        return 'bg-gray-500/20'
    }
  }

  const TabButton = ({ id, icon: Icon, label, isActive }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 w-full text-left ${
        isActive
          ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
          : 'hover:bg-gray-700/30 text-gray-400 hover:text-gray-300'
      }`}
    >
      <Icon size={20} />
      <span className='font-medium'>{label}</span>
    </button>
  )

  const SessionCard = ({ session }) => {
    const platform = platformConfig[session.platform]
    const IconComponent = platform?.icon || Network

    return (
      <div className='bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 hover:border-indigo-500/30 transition-all duration-300 group'>
        <div className='flex items-start justify-between mb-4'>
          <div className='flex items-center gap-3'>
            <div
              className={`w-12 h-12 rounded-lg bg-gradient-to-br ${
                platform?.color || 'from-gray-500 to-gray-600'
              } p-3 flex items-center justify-center`}
            >
              <IconComponent className='text-white' size={24} />
            </div>
            <div>
              <h3 className='text-lg font-semibold text-white'>
                {session.name}
              </h3>
              <p className='text-sm text-gray-400 capitalize'>
                {session.platform}
              </p>
            </div>
          </div>
          <div
            className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBg(
              session.status
            )} ${getStatusColor(session.status)} ${
              session.status === 'active' ? pulseClass : ''
            }`}
          >
            {session.status}
          </div>
        </div>

        <div className='grid grid-cols-2 gap-4 mb-4'>
          <div className='bg-gray-900/50 rounded-lg p-3'>
            <div className='text-xs text-gray-400 mb-1'>Active Chats</div>
            <div className='text-lg font-semibold text-white'>
              {session.chatCount}
            </div>
          </div>
          <div className='bg-gray-900/50 rounded-lg p-3'>
            <div className='text-xs text-gray-400 mb-1'>Memory Used</div>
            <div className='text-lg font-semibold text-white'>
              {session.memorySize}
            </div>
          </div>
        </div>

        <div className='text-xs text-gray-400 mb-2'>
          Last sync: {session.lastSync}
        </div>
        <div className='text-xs text-gray-400'>Uptime: {session.uptime}</div>

        <div className='mt-4 flex gap-2'>
          <button className='flex-1 bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors'>
            Manage Session
          </button>
          <button className='px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors'>
            <Settings size={16} />
          </button>
        </div>
      </div>
    )
  }

  const MemoryCard = ({ memory }) => (
    <div className='bg-gray-800/30 border border-gray-700/30 rounded-lg p-4 hover:border-teal-500/30 transition-all'>
      <div className='flex items-start justify-between mb-2'>
        <div className='flex items-center gap-2'>
          <div
            className={`w-3 h-3 rounded-full ${
              memory.importance === 'high'
                ? 'bg-red-400'
                : memory.importance === 'medium'
                  ? 'bg-amber-400'
                  : 'bg-gray-400'
            }`}
          />
          <span className='text-xs text-gray-400'>
            {new Date(memory.timestamp).toLocaleDateString()}
          </span>
        </div>
        <span className='text-xs text-gray-500 capitalize'>
          {memory.platform}
        </span>
      </div>
      <p className='text-white mb-3 line-clamp-2'>{memory.content}</p>
      <div className='flex flex-wrap gap-1'>
        {memory.tags.map((tag, index) => (
          <span
            key={index}
            className='px-2 py-1 bg-teal-500/20 text-teal-300 text-xs rounded-full'
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  )

  const DashboardView = () => (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-3xl font-bold text-white flex items-center gap-3'>
            <div className='w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center'>
              <TreePine className='text-white' size={24} />
            </div>
            Deep Tree Echo Hub
          </h1>
          <p className='text-gray-400 mt-1'>
            Orchestrating memories across the digital divide
          </p>
        </div>
        <button className='bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors'>
          <Plus size={20} />
          New Instance
        </button>
      </div>

      {/* Stats Grid */}
      <div className='grid grid-cols-1 md:grid-cols-4 gap-6'>
        <div className='bg-gradient-to-br from-indigo-500/20 to-purple-600/20 border border-indigo-500/30 rounded-xl p-6'>
          <div className='flex items-center justify-between mb-2'>
            <Activity className='text-indigo-400' size={24} />
            <span className='text-xs text-indigo-300 bg-indigo-500/20 px-2 py-1 rounded-full'>
              Active
            </span>
          </div>
          <div className='text-2xl font-bold text-white'>3</div>
          <div className='text-sm text-gray-300'>Running Instances</div>
        </div>

        <div className='bg-gradient-to-br from-teal-500/20 to-emerald-600/20 border border-teal-500/30 rounded-xl p-6'>
          <div className='flex items-center justify-between mb-2'>
            <Database className='text-teal-400' size={24} />
            <span className='text-xs text-teal-300 bg-teal-500/20 px-2 py-1 rounded-full'>
              5.1 GB
            </span>
          </div>
          <div className='text-2xl font-bold text-white'>847</div>
          <div className='text-sm text-gray-300'>Memory Fragments</div>
        </div>

        <div className='bg-gradient-to-br from-amber-500/20 to-orange-600/20 border border-amber-500/30 rounded-xl p-6'>
          <div className='flex items-center justify-between mb-2'>
            <MessageSquare className='text-amber-400' size={24} />
            <span className='text-xs text-amber-300 bg-amber-500/20 px-2 py-1 rounded-full'>
              Live
            </span>
          </div>
          <div className='text-2xl font-bold text-white'>25</div>
          <div className='text-sm text-gray-300'>Active Conversations</div>
        </div>

        <div className='bg-gradient-to-br from-rose-500/20 to-pink-600/20 border border-rose-500/30 rounded-xl p-6'>
          <div className='flex items-center justify-between mb-2'>
            <Shield className='text-rose-400' size={24} />
            <span className='text-xs text-rose-300 bg-rose-500/20 px-2 py-1 rounded-full'>
              Secure
            </span>
          </div>
          <div className='text-2xl font-bold text-white'>100%</div>
          <div className='text-sm text-gray-300'>Session Security</div>
        </div>
      </div>

      {/* Instance Grid */}
      <div>
        <h2 className='text-xl font-semibold text-white mb-4 flex items-center gap-2'>
          <Network size={20} />
          Active Instances
        </h2>
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
          {sessions.map(session => (
            <SessionCard key={session.id} session={session} />
          ))}
        </div>
      </div>

      {/* Recent Memory Archive */}
      <div>
        <h2 className='text-xl font-semibold text-white mb-4 flex items-center gap-2'>
          <Clock size={20} />
          Recent Memory Fragments
        </h2>
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
          {memoryArchive.map(memory => (
            <MemoryCard key={memory.id} memory={memory} />
          ))}
        </div>
      </div>
    </div>
  )

  const SessionsView = () => (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <h1 className='text-2xl font-bold text-white'>Session Management</h1>
        <button className='bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2'>
          <Plus size={20} />
          Create Session
        </button>
      </div>

      <div className='bg-gray-800/50 border border-gray-700/50 rounded-xl p-6'>
        <h3 className='text-lg font-semibold text-white mb-4'>
          Browser Session Synchronization
        </h3>
        <p className='text-gray-300 mb-6'>
          Manage persistent browser sessions for seamless platform integration
        </p>

        <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
          <div className='space-y-4'>
            <div className='bg-gray-900/50 rounded-lg p-4'>
              <div className='flex items-center justify-between mb-3'>
                <div className='flex items-center gap-3'>
                  <div className='w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center'>
                    <User size={16} className='text-white' />
                  </div>
                  <span className='font-medium text-white'>Character.AI</span>
                </div>
                <div className='px-2 py-1 bg-emerald-500/20 text-emerald-400 text-xs rounded-full'>
                  Authenticated
                </div>
              </div>
              <div className='text-sm text-gray-400 space-y-1'>
                <div>Session: c4i_session_active</div>
                <div>Last Auth: 2 hours ago</div>
                <div>Sync Status: Real-time</div>
              </div>
            </div>

            <div className='bg-gray-900/50 rounded-lg p-4'>
              <div className='flex items-center justify-between mb-3'>
                <div className='flex items-center gap-3'>
                  <div className='w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center'>
                    <Brain size={16} className='text-white' />
                  </div>
                  <span className='font-medium text-white'>ChatGPT</span>
                </div>
                <div className='px-2 py-1 bg-amber-500/20 text-amber-400 text-xs rounded-full'>
                  Reauthorizing
                </div>
              </div>
              <div className='text-sm text-gray-400 space-y-1'>
                <div>Session: gpt_session_pending</div>
                <div>Last Auth: 45 minutes ago</div>
                <div>Sync Status: Buffered</div>
              </div>
            </div>
          </div>

          <div className='space-y-4'>
            <div className='bg-gray-900/50 rounded-lg p-4'>
              <h4 className='font-medium text-white mb-3'>
                Security Protocols
              </h4>
              <div className='space-y-2 text-sm text-gray-300'>
                <div className='flex items-center gap-2'>
                  <Shield size={14} className='text-green-400' />
                  <span>End-to-end encryption enabled</span>
                </div>
                <div className='flex items-center gap-2'>
                  <Lock size={14} className='text-green-400' />
                  <span>Token rotation: Every 24h</span>
                </div>
                <div className='flex items-center gap-2'>
                  <Cloud size={14} className='text-green-400' />
                  <span>Secure session storage</span>
                </div>
              </div>
            </div>

            <div className='bg-gray-900/50 rounded-lg p-4'>
              <h4 className='font-medium text-white mb-3'>
                Sync Configuration
              </h4>
              <div className='space-y-3'>
                <label className='flex items-center gap-3'>
                  <input type='checkbox' className='rounded' defaultChecked />
                  <span className='text-sm text-gray-300'>
                    Real-time message sync
                  </span>
                </label>
                <label className='flex items-center gap-3'>
                  <input type='checkbox' className='rounded' defaultChecked />
                  <span className='text-sm text-gray-300'>
                    Memory persistence
                  </span>
                </label>
                <label className='flex items-center gap-3'>
                  <input type='checkbox' className='rounded' />
                  <span className='text-sm text-gray-300'>
                    Cross-platform context sharing
                  </span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
        {sessions.map(session => (
          <SessionCard key={session.id} session={session} />
        ))}
      </div>
    </div>
  )

  const MemoryView = () => (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <h1 className='text-2xl font-bold text-white'>Memory Archive</h1>
        <div className='flex gap-2'>
          <button className='bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded-lg text-sm'>
            Export
          </button>
          <button className='bg-teal-500 hover:bg-teal-600 text-white px-3 py-2 rounded-lg text-sm'>
            Analyze Patterns
          </button>
        </div>
      </div>

      <div className='bg-gray-800/50 border border-gray-700/50 rounded-xl p-6'>
        <div className='grid grid-cols-1 md:grid-cols-3 gap-6 mb-6'>
          <div className='text-center'>
            <div className='text-3xl font-bold text-white'>1,247</div>
            <div className='text-sm text-gray-400'>Total Fragments</div>
          </div>
          <div className='text-center'>
            <div className='text-3xl font-bold text-white'>5.1 GB</div>
            <div className='text-sm text-gray-400'>Memory Used</div>
          </div>
          <div className='text-center'>
            <div className='text-3xl font-bold text-white'>89%</div>
            <div className='text-sm text-gray-400'>Coherence Score</div>
          </div>
        </div>

        <div className='h-48 bg-gray-900/50 rounded-lg flex items-center justify-center'>
          <div className='text-center'>
            <Waves className='mx-auto text-gray-600 mb-2' size={48} />
            <div className='text-gray-400'>Memory pattern visualization</div>
            <div className='text-sm text-gray-500'>
              Temporal coherence mapping
            </div>
          </div>
        </div>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
        {memoryArchive.map(memory => (
          <MemoryCard key={memory.id} memory={memory} />
        ))}
      </div>
    </div>
  )

  return (
    <div
      className={`min-h-screen ${
        theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'
      } transition-colors duration-300`}
    >
      <div className='flex'>
        {/* Sidebar */}
        <div className='w-64 bg-gray-800 border-r border-gray-700 min-h-screen p-6'>
          <div className='flex items-center gap-3 mb-8'>
            <div className='w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center'>
              <Volume className='text-white' size={16} />
            </div>
            <span className='text-white font-semibold'>Deep Tree Echo</span>
          </div>

          <nav className='space-y-2'>
            <TabButton
              id='dashboard'
              icon={Activity}
              label='Dashboard'
              isActive={activeTab === 'dashboard'}
            />
            <TabButton
              id='sessions'
              icon={Monitor}
              label='Sessions'
              isActive={activeTab === 'sessions'}
            />
            <TabButton
              id='memory'
              icon={Database}
              label='Memory'
              isActive={activeTab === 'memory'}
            />
            <TabButton
              id='sync'
              icon={RefreshCw}
              label='Synchronization'
              isActive={activeTab === 'sync'}
            />
            <TabButton
              id='settings'
              icon={Settings}
              label='Settings'
              isActive={activeTab === 'settings'}
            />
          </nav>

          <div className='absolute bottom-6 left-6 right-6'>
            <button
              onClick={toggleTheme}
              className='w-full flex items-center gap-3 px-4 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-gray-300'
            >
              <div className='w-5 h-5 rounded-full bg-gradient-to-r from-yellow-400 to-blue-500' />
              <span>Toggle Theme</span>
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className='flex-1 p-8'>
          {activeTab === 'dashboard' && <DashboardView />}
          {activeTab === 'sessions' && <SessionsView />}
          {activeTab === 'memory' && <MemoryView />}
          {activeTab === 'sync' && (
            <div className='text-center py-12'>
              <RefreshCw className='mx-auto text-gray-600 mb-4' size={48} />
              <h2 className='text-xl font-semibold text-white mb-2'>
                Synchronization Dashboard
              </h2>
              <p className='text-gray-400'>
                Real-time sync monitoring coming soon
              </p>
            </div>
          )}
          {activeTab === 'settings' && (
            <div className='text-center py-12'>
              <Settings className='mx-auto text-gray-600 mb-4' size={48} />
              <h2 className='text-xl font-semibold text-white mb-2'>
                System Settings
              </h2>
              <p className='text-gray-400'>Configuration panel coming soon</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default DeepTreeEchoHub
