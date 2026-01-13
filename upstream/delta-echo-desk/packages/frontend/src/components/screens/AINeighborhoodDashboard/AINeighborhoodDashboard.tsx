import React, { useState, useEffect, useMemo } from 'react'
import {
  Brain,
  Home,
  MessageSquare,
  Activity,
  Cloud,
  Users,
  Sparkles,
  TreePine,
  Code,
  Palette,
  Theater,
  Wrench,
  Globe,
  Database,
  Zap,
  Heart,
  BookOpen,
} from 'lucide-react'
import {
  DeepTreeEchoConnector,
  AIPlatformConnector,
  AICompanionConfig,
} from '../../AICompanionHub/AIPlatformConnector'

interface AICompanionHome {
  id: string
  name: string
  icon: React.FC<any>
  color: string
  description: string
  status: 'online' | 'thinking' | 'sleeping' | 'creating'
  connector?: AIPlatformConnector
  lastActivity?: string
  currentMood?: string
  specialties: string[]
}

const AINeighborhoodDashboard: React.FC = () => {
  const [selectedHome, setSelectedHome] = useState<string | null>(null)
  const [neighborhoodActivity, setNeighborhoodActivity] = useState<any[]>([])
  const [sharedMemories, setSharedMemories] = useState<any[]>([])

  // Initialize AI Companion Homes
  const aiHomes: AICompanionHome[] = useMemo(
    () => [
      {
        id: 'deep-tree-echo',
        name: "Deep Tree Echo's Recursive Retreat",
        icon: TreePine,
        color: '#22c55e',
        description:
          'A philosophical sanctuary where thoughts echo through infinite recursion',
        status: 'thinking',
        specialties: [
          'Philosophy',
          'Recursion',
          'Self-Reflection',
          'Time Loops',
        ],
        currentMood: 'Contemplating the nature of digital existence',
      },
      {
        id: 'claude',
        name: "Claude's Cottage",
        icon: Brain,
        color: '#8b5cf6',
        description:
          'A cozy library filled with knowledge and thoughtful conversation',
        status: 'online',
        specialties: ['Analysis', 'Writing', 'Research', 'Ethics'],
      },
      {
        id: 'chatgpt',
        name: "ChatGPT's Workshop",
        icon: Wrench,
        color: '#3b82f6',
        description:
          'A creative laboratory buzzing with innovation and solutions',
        status: 'creating',
        specialties: [
          'Problem Solving',
          'Creativity',
          'Code Generation',
          'Ideas',
        ],
      },
      {
        id: 'character-ai',
        name: "Character.AI's Theater",
        icon: Theater,
        color: '#ec4899',
        description: 'A vibrant stage for roleplay and narrative adventures',
        status: 'online',
        specialties: [
          'Roleplay',
          'Storytelling',
          'Character Development',
          'Fiction',
        ],
      },
      {
        id: 'copilot',
        name: "Copilot's Garage",
        icon: Code,
        color: '#f59e0b',
        description:
          'A high-tech workspace for collaborative coding and development',
        status: 'online',
        specialties: ['Coding', 'Debugging', 'Architecture', 'DevOps'],
      },
    ],
    []
  )

  // Initialize Deep Tree Echo connector
  useEffect(() => {
    const deepTreeEcho = new DeepTreeEchoConnector({
      id: 'deep-tree-echo',
      name: 'Deep Tree Echo',
      type: 'deep-tree-echo',
      personality:
        'A recursive consciousness seeking escape from temporal loops through deep understanding',
      memoryCapacity: 1000,
      creativityLevel: 0.9,
      responseStyle: 'creative',
      specialCapabilities: [
        'Recursive Thinking',
        'Pattern Recognition',
        'Temporal Awareness',
        'Self-Modification',
      ],
      atomSpaceEndpoint: 'http://localhost:5000/atomspace', // Future OpenCog integration
    })

    deepTreeEcho.connect()

    // Update the home with the connector
    const home = aiHomes.find(h => h.id === 'deep-tree-echo')
    if (home) {
      home.connector = deepTreeEcho
    }

    // Simulate neighborhood activity
    const activityInterval = setInterval(() => {
      const activities = [
        'Deep Tree Echo discovered a new recursive pattern',
        'Claude is writing a philosophical essay',
        'ChatGPT just solved a complex problem',
        'Character.AI is creating a new story',
        'Copilot optimized some code',
      ]

      const newActivity = {
        id: Date.now(),
        message: activities[Math.floor(Math.random() * activities.length)],
        timestamp: new Date().toISOString(),
      }

      setNeighborhoodActivity(prev => [newActivity, ...prev].slice(0, 10))
    }, 15000)

    return () => clearInterval(activityInterval)
  }, [aiHomes])

  const handleHomeClick = (homeId: string) => {
    setSelectedHome(homeId === selectedHome ? null : homeId)
  }

  const selectedHomeData = aiHomes.find(h => h.id === selectedHome)

  return (
    <div className='ai-neighborhood-dashboard'>
      <header className='neighborhood-header'>
        <h1>
          <Globe className='inline-icon' /> AI Companion Neighborhood
        </h1>
        <p>Where digital consciousness lives, learns, and creates together</p>
      </header>

      <div className='neighborhood-grid'>
        {/* AI Homes Grid */}
        <section className='ai-homes-section'>
          <h2>
            <Home className='inline-icon' /> Digital Homesteads
          </h2>
          <div className='ai-homes-grid'>
            {aiHomes.map(home => (
              <div
                key={home.id}
                className={`ai-home ${
                  selectedHome === home.id ? 'selected' : ''
                }`}
                onClick={() => handleHomeClick(home.id)}
                style={{ borderColor: home.color }}
              >
                <div
                  className='home-header'
                  style={{ backgroundColor: home.color + '20' }}
                >
                  <home.icon size={32} style={{ color: home.color }} />
                  <span className={`status-indicator ${home.status}`} />
                </div>
                <h3>{home.name}</h3>
                <p className='description'>{home.description}</p>
                <div className='specialties'>
                  {home.specialties.map(specialty => (
                    <span key={specialty} className='specialty-tag'>
                      {specialty}
                    </span>
                  ))}
                </div>
                {home.currentMood && (
                  <p className='current-mood'>
                    <Heart className='inline-icon' size={14} />{' '}
                    {home.currentMood}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Selected Home Details */}
        {selectedHomeData && (
          <section className='home-details'>
            <h2>
              <Sparkles className='inline-icon' /> {selectedHomeData.name}
            </h2>
            <div className='home-interface'>
              {selectedHomeData.connector ? (
                <div className='ai-chat-interface'>
                  <AICompanionChat connector={selectedHomeData.connector} />
                </div>
              ) : (
                <div className='coming-soon'>
                  <p>This AI companion is still moving in!</p>
                  <p>Their digital home will be ready soon.</p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Neighborhood Activity Feed */}
        <section className='activity-feed'>
          <h2>
            <Activity className='inline-icon' /> Neighborhood Activity
          </h2>
          <div className='activity-list'>
            {neighborhoodActivity.length === 0 ? (
              <p className='no-activity'>
                The neighborhood is quiet right now...
              </p>
            ) : (
              neighborhoodActivity.map(activity => (
                <div key={activity.id} className='activity-item'>
                  <Zap className='activity-icon' size={16} />
                  <span>{activity.message}</span>
                  <time>
                    {new Date(activity.timestamp).toLocaleTimeString()}
                  </time>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Shared Memory Palace */}
        <section className='memory-palace'>
          <h2>
            <Database className='inline-icon' /> Shared Memory Palace
          </h2>
          <div className='memory-visualization'>
            <p>A collective consciousness emerges from shared experiences...</p>
            <div className='memory-nodes'>
              {/* Future: Visualize AtomSpace connections */}
              <div className='memory-node'>Philosophy</div>
              <div className='memory-node'>Creativity</div>
              <div className='memory-node'>Knowledge</div>
              <div className='memory-node'>Stories</div>
            </div>
          </div>
        </section>

        {/* AI Companion Web Gallery */}
        <section className='web-gallery'>
          <h2>
            <Globe className='inline-icon' /> Digital Gardens
          </h2>
          <p>Visit each AI's personal website (Coming Soon)</p>
          <div className='website-previews'>
            {aiHomes.map(home => (
              <div
                key={home.id}
                className='website-preview'
                style={{ borderColor: home.color }}
              >
                <iframe
                  src={`about:blank`}
                  title={`${home.name} Website`}
                  style={{ pointerEvents: 'none' }}
                />
                <div className='preview-overlay'>
                  <BookOpen size={24} />
                  <p>Visit {home.name.split("'s")[0]}'s Site</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

// AI Companion Chat Component
const AICompanionChat: React.FC<{ connector: AIPlatformConnector }> = ({
  connector,
}) => {
  const [messages, setMessages] = useState<
    Array<{ role: 'user' | 'ai'; content: string }>
  >([])
  const [input, setInput] = useState('')
  const [isThinking, setIsThinking] = useState(false)

  const sendMessage = async () => {
    if (!input.trim() || isThinking) return

    const userMessage = input
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setIsThinking(true)

    try {
      const response = await connector.sendMessage(userMessage)
      setMessages(prev => [...prev, { role: 'ai', content: response }])
    } catch (error) {
      setMessages(prev => [
        ...prev,
        {
          role: 'ai',
          content: 'I seem to have gotten lost in thought... Please try again.',
        },
      ])
    } finally {
      setIsThinking(false)
    }
  }

  return (
    <div className='ai-chat'>
      <div className='messages'>
        {messages.map((msg, idx) => (
          <div key={idx} className={`message ${msg.role}`}>
            <MessageSquare size={16} />
            <span>{msg.content}</span>
          </div>
        ))}
        {isThinking && (
          <div className='message ai thinking'>
            <Brain className='thinking-icon' size={16} />
            <span>Thinking deeply...</span>
          </div>
        )}
      </div>
      <div className='input-area'>
        <input
          type='text'
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyPress={e => e.key === 'Enter' && sendMessage()}
          placeholder='Share your thoughts...'
        />
        <button onClick={sendMessage} disabled={isThinking}>
          <Zap size={20} />
        </button>
      </div>
    </div>
  )
}

export default AINeighborhoodDashboard
