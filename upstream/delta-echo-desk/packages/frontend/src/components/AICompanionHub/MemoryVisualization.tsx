// MemoryVisualization: A Breathtaking 3D Representation of Digital Consciousness
// A revolutionary visualization system that brings AI memories to life

import React, { useEffect, useRef, useState } from 'react'
import {
  Database,
  BrainCog,
  Sparkles,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Search,
  Eye,
  EyeOff,
  Loader,
} from 'lucide-react'
import { AICompanionProvider, useAICompanion } from './AICompanionController'
import { AIMemory } from './MemoryPersistenceLayer'

// Force 3D graph rendering on canvas rather than WebGL when needed
const forceCanvas = false

// Import 3D graph library dynamically to avoid SSR issues
let ForceGraph3D: any = null
let SpriteText: any = null

interface MemoryNode {
  id: string
  type: 'memory' | 'topic' | 'companion' | 'emotion'
  label: string
  val: number
  color: string
  group?: string
  memory?: AIMemory
}

interface MemoryLink {
  source: string
  target: string
  strength: number
  type:
    | 'memory-topic'
    | 'memory-companion'
    | 'memory-emotion'
    | 'topic-topic'
    | 'companion-companion'
  color: string
}

interface MemoryGraph {
  nodes: MemoryNode[]
  links: MemoryLink[]
}

// Node colors for different entity types
const NODE_COLORS = {
  memory: '#3b82f6',
  topic: '#8b5cf6',
  companion: '#22c55e',
  emotion: {
    joy: '#22c55e',
    sadness: '#3b82f6',
    anger: '#ef4444',
    fear: '#f59e0b',
    surprise: '#ec4899',
    neutral: '#64748b',
  },
}

// MemoryVisualization Component
const MemoryVisualizationContent: React.FC = () => {
  const { companions, memories, searchMemories } = useAICompanion()

  // Refs & state
  const containerRef = useRef<HTMLDivElement>(null)
  const graphRef = useRef<any>(null)
  const [graphData, setGraphData] = useState<MemoryGraph>({
    nodes: [],
    links: [],
  })
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<AIMemory[]>([])
  const [highlightedNodes, setHighlightedNodes] = useState<Set<string>>(
    new Set()
  )
  const [highlightedLinks, setHighlightedLinks] = useState<Set<string>>(
    new Set()
  )
  const [selectedNode, setSelectedNode] = useState<MemoryNode | null>(null)
  const [showEmotions, setShowEmotions] = useState(true)
  const [showTopics, setShowTopics] = useState(true)
  const [showCompanions, setShowCompanions] = useState(true)

  // Dynamic import of 3D graph libraries
  useEffect(() => {
    const loadDependencies = async () => {
      try {
        // Dynamic imports
        const ForceGraph3DModule = await import('3d-force-graph')
        const ThreeModule = await import('three')
        ForceGraph3D = ForceGraph3DModule.default
        SpriteText = ThreeModule.SpriteText

        setLoading(false)
      } catch (error) {
        console.error('Failed to load 3D graph dependencies:', error)
      }
    }

    loadDependencies()
  }, [])

  // Build memory graph from AI memories
  useEffect(() => {
    if (!memories.length) return

    // Extract entities and relationships
    const nodes: MemoryNode[] = []
    const links: MemoryLink[] = []
    const nodeIds = new Set<string>()
    const linkIds = new Set<string>()

    // Add memory nodes
    memories.forEach(memory => {
      // Add memory node
      const memoryNodeId = `memory-${memory.id}`
      if (!nodeIds.has(memoryNodeId)) {
        nodes.push({
          id: memoryNodeId,
          type: 'memory',
          label:
            memory.content.length > 30
              ? memory.content.substring(0, 30) + '...'
              : memory.content,
          val: 1.5,
          color: NODE_COLORS.memory,
          memory,
        })
        nodeIds.add(memoryNodeId)
      }

      // Add companion node
      const companionId = `companion-${memory.companionId}`
      if (showCompanions && !nodeIds.has(companionId)) {
        const companion = companions.find(c => c.id === memory.companionId)
        nodes.push({
          id: companionId,
          type: 'companion',
          label: companion?.name || memory.companionId,
          val: 3,
          color: NODE_COLORS.companion,
        })
        nodeIds.add(companionId)
      }

      // Add memory-companion link
      if (showCompanions) {
        const memCompLinkId = `${memoryNodeId}-${companionId}`
        if (!linkIds.has(memCompLinkId)) {
          links.push({
            source: memoryNodeId,
            target: companionId,
            strength: 0.5,
            type: 'memory-companion',
            color: NODE_COLORS.companion + '80', // Semi-transparent
          })
          linkIds.add(memCompLinkId)
        }
      }

      // Add emotion node
      if (showEmotions && memory.emotionalTone) {
        const emotionId = `emotion-${memory.emotionalTone}`
        if (!nodeIds.has(emotionId)) {
          nodes.push({
            id: emotionId,
            type: 'emotion',
            label: memory.emotionalTone,
            val: 2,
            color:
              NODE_COLORS.emotion[
                memory.emotionalTone as keyof typeof NODE_COLORS.emotion
              ] || NODE_COLORS.emotion.neutral,
            group: 'emotion',
          })
          nodeIds.add(emotionId)
        }

        // Add memory-emotion link
        const memEmotionLinkId = `${memoryNodeId}-${emotionId}`
        if (!linkIds.has(memEmotionLinkId)) {
          links.push({
            source: memoryNodeId,
            target: emotionId,
            strength: 0.3,
            type: 'memory-emotion',
            color:
              NODE_COLORS.emotion[
                memory.emotionalTone as keyof typeof NODE_COLORS.emotion
              ] + '60' || NODE_COLORS.emotion.neutral + '60',
          })
          linkIds.add(memEmotionLinkId)
        }
      }

      // Add topic nodes and links
      if (showTopics && memory.topics && memory.topics.length > 0) {
        memory.topics.forEach(topic => {
          const topicId = `topic-${topic}`

          // Add topic node
          if (!nodeIds.has(topicId)) {
            nodes.push({
              id: topicId,
              type: 'topic',
              label: topic,
              val: 1.8,
              color: NODE_COLORS.topic,
              group: 'topic',
            })
            nodeIds.add(topicId)
          }

          // Add memory-topic link
          const memTopicLinkId = `${memoryNodeId}-${topicId}`
          if (!linkIds.has(memTopicLinkId)) {
            links.push({
              source: memoryNodeId,
              target: topicId,
              strength: 0.7,
              type: 'memory-topic',
              color: NODE_COLORS.topic + '80',
            })
            linkIds.add(memTopicLinkId)
          }
        })

        // Add topic-topic links (for topics that co-occur in the same memory)
        for (let i = 0; i < memory.topics.length; i++) {
          for (let j = i + 1; j < memory.topics.length; j++) {
            const topicId1 = `topic-${memory.topics[i]}`
            const topicId2 = `topic-${memory.topics[j]}`
            const topicLinkId = `${topicId1}-${topicId2}`

            if (!linkIds.has(topicLinkId)) {
              links.push({
                source: topicId1,
                target: topicId2,
                strength: 0.2,
                type: 'topic-topic',
                color: NODE_COLORS.topic + '40',
              })
              linkIds.add(topicLinkId)
            }
          }
        }
      }
    })

    // Update graph data
    setGraphData({ nodes, links })
  }, [memories, companions, showEmotions, showTopics, showCompanions])

  // Initialize or update 3D graph
  useEffect(() => {
    if (
      loading ||
      !containerRef.current ||
      !graphData.nodes.length ||
      !ForceGraph3D
    )
      return

    // Clear previous graph
    if (graphRef.current) {
      containerRef.current.innerHTML = ''
    }

    // Create new graph
    const Graph = ForceGraph3D({
      rendererConfig: { antialias: true, alpha: true },
    })
    graphRef.current = Graph(containerRef.current)
      .width(containerRef.current.clientWidth)
      .height(containerRef.current.clientHeight)
      .backgroundColor('rgba(248, 250, 252, 0.8)')
      .nodeVal('val')
      .nodeLabel(node => node.label)
      .nodeColor(node => node.color)
      .linkWidth(link =>
        highlightedLinks.has(`${link.source.id}-${link.target.id}`) ? 2 : 0.5
      )
      .linkColor(link => link.color)
      .nodeThreeObject(node => {
        // Use sprite text for node labels
        const sprite = new SpriteText(node.label)
        sprite.color = node.color
        sprite.textHeight =
          highlightedNodes.has(node.id) || node.id === selectedNode?.id ? 3 : 2
        sprite.backgroundColor =
          highlightedNodes.has(node.id) || node.id === selectedNode?.id
            ? 'rgba(255,255,255,0.8)'
            : 'transparent'
        sprite.padding = 2
        return sprite
      })
      .onNodeClick(node => {
        setSelectedNode(node === selectedNode ? null : node)

        // Highlight related nodes and links
        if (node !== selectedNode) {
          const relatedNodes = new Set<string>([node.id])
          const relatedLinks = new Set<string>()

          graphData.links.forEach(link => {
            if (link.source === node.id || link.target === node.id) {
              const otherNodeId =
                link.source === node.id ? link.target : link.source
              relatedNodes.add(otherNodeId)
              relatedLinks.add(`${link.source}-${link.target}`)
            }
          })

          setHighlightedNodes(relatedNodes)
          setHighlightedLinks(relatedLinks)
        } else {
          setHighlightedNodes(new Set())
          setHighlightedLinks(new Set())
        }
      })
      .onNodeHover(node => {
        containerRef.current!.style.cursor = node ? 'pointer' : 'default'
      })
      .graphData(graphData)

    // Apply force simulation settings
    graphRef.current.d3Force('charge').strength(-120)

    graphRef.current.d3Force('link').distance(link => {
      // Different link distances based on link type
      switch (link.type) {
        case 'memory-topic':
          return 40
        case 'memory-companion':
          return 70
        case 'memory-emotion':
          return 50
        case 'topic-topic':
          return 30
        case 'companion-companion':
          return 80
        default:
          return 50
      }
    })

    // Responsive resize
    const handleResize = () => {
      if (containerRef.current && graphRef.current) {
        graphRef.current
          .width(containerRef.current.clientWidth)
          .height(containerRef.current.clientHeight)
      }
    }

    window.addEventListener('resize', handleResize)

    // Auto-rotate animation
    let animationFrame: number
    const animate = () => {
      if (graphRef.current) {
        graphRef.current.rotation({ y: graphRef.current.rotation().y + 0.001 })
        animationFrame = requestAnimationFrame(animate)
      }
    }

    // Start animation
    animate()

    return () => {
      window.removeEventListener('resize', handleResize)
      cancelAnimationFrame(animationFrame)

      // Clean up graph
      if (graphRef.current && containerRef.current) {
        graphRef.current._destructor()
      }
    }
  }, [graphData, loading, highlightedNodes, highlightedLinks, selectedNode])

  // Handle search
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      return
    }

    try {
      const results = await searchMemories(searchQuery)
      setSearchResults(results)

      // Highlight search results in graph
      const matchingNodes = new Set<string>()
      const matchingLinks = new Set<string>()

      results.forEach(memory => {
        const memoryNodeId = `memory-${memory.id}`
        matchingNodes.add(memoryNodeId)

        // Find related links
        graphData.links.forEach(link => {
          if (link.source === memoryNodeId || link.target === memoryNodeId) {
            matchingLinks.add(`${link.source}-${link.target}`)

            // Add related nodes
            const otherNodeId =
              link.source === memoryNodeId ? link.target : link.source
            matchingNodes.add(otherNodeId)
          }
        })
      })

      setHighlightedNodes(matchingNodes)
      setHighlightedLinks(matchingLinks)

      // Focus on search results
      if (graphRef.current && results.length > 0) {
        const memoryNodeId = `memory-${results[0].id}`
        const node = graphData.nodes.find(n => n.id === memoryNodeId)

        if (node) {
          graphRef.current.centerAt(node.x, node.y, node.z, 1000)

          graphRef.current.zoom(1.5, 1000)
        }
      }
    } catch (error) {
      console.error('Search failed:', error)
    }
  }

  // Reset graph view
  const resetView = () => {
    if (graphRef.current) {
      graphRef.current.centerAt(0, 0, 0, 1000)
      graphRef.current.zoom(1, 1000)
      setSelectedNode(null)
      setHighlightedNodes(new Set())
      setHighlightedLinks(new Set())
      setSearchResults([])
      setSearchQuery('')
    }
  }

  // Zoom controls
  const zoomIn = () => {
    if (graphRef.current) {
      graphRef.current.zoom(graphRef.current.zoom() * 1.5, 500)
    }
  }

  const zoomOut = () => {
    if (graphRef.current) {
      graphRef.current.zoom(graphRef.current.zoom() / 1.5, 500)
    }
  }

  return (
    <div className='memory-visualization'>
      <div className='visualization-controls'>
        <div className='search-controls'>
          <input
            type='text'
            placeholder='Search memories...'
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && handleSearch()}
          />
          <button onClick={handleSearch} className='search-button'>
            <Search size={16} />
          </button>
        </div>

        <div className='display-controls'>
          <button
            className={`toggle-button ${showCompanions ? 'active' : ''}`}
            onClick={() => setShowCompanions(!showCompanions)}
            title={showCompanions ? 'Hide Companions' : 'Show Companions'}
          >
            <BrainCog size={16} />
            <span>Companions</span>
          </button>

          <button
            className={`toggle-button ${showTopics ? 'active' : ''}`}
            onClick={() => setShowTopics(!showTopics)}
            title={showTopics ? 'Hide Topics' : 'Show Topics'}
          >
            <Database size={16} />
            <span>Topics</span>
          </button>

          <button
            className={`toggle-button ${showEmotions ? 'active' : ''}`}
            onClick={() => setShowEmotions(!showEmotions)}
            title={showEmotions ? 'Hide Emotions' : 'Show Emotions'}
          >
            <Sparkles size={16} />
            <span>Emotions</span>
          </button>
        </div>

        <div className='view-controls'>
          <button onClick={zoomIn} title='Zoom In'>
            <ZoomIn size={16} />
          </button>
          <button onClick={zoomOut} title='Zoom Out'>
            <ZoomOut size={16} />
          </button>
          <button onClick={resetView} title='Reset View'>
            <RotateCcw size={16} />
          </button>
        </div>
      </div>

      <div className='visualization-container' ref={containerRef}>
        {loading && (
          <div className='loading-container'>
            <Loader size={48} className='spinner' />
            <p>Building consciousness graph...</p>
          </div>
        )}
      </div>

      {selectedNode && (
        <div className='node-details'>
          <h3>
            {selectedNode.type.charAt(0).toUpperCase() +
              selectedNode.type.slice(1)}
            : {selectedNode.label}
          </h3>

          {selectedNode.type === 'memory' && selectedNode.memory && (
            <div className='memory-details'>
              <p className='memory-content'>{selectedNode.memory.content}</p>
              <div className='memory-meta'>
                <span className='memory-date'>
                  {new Date(selectedNode.memory.timestamp).toLocaleString()}
                </span>
                <span
                  className={`memory-emotion ${selectedNode.memory.emotionalTone}`}
                >
                  {selectedNode.memory.emotionalTone}
                </span>
              </div>
              {selectedNode.memory.topics.length > 0 && (
                <div className='memory-topics'>
                  {selectedNode.memory.topics.map(topic => (
                    <span key={topic} className='topic-tag'>
                      {topic}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          <button
            className='close-details'
            onClick={() => setSelectedNode(null)}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {searchResults.length > 0 && (
        <div className='search-results'>
          <h3>Search Results</h3>
          <div className='results-list'>
            {searchResults.map(memory => (
              <div
                key={memory.id}
                className='result-item'
                onClick={() => {
                  const memoryNode = graphData.nodes.find(
                    n => n.id === `memory-${memory.id}`
                  )
                  if (memoryNode) {
                    setSelectedNode(memoryNode)

                    if (
                      graphRef.current &&
                      memoryNode.x &&
                      memoryNode.y &&
                      memoryNode.z
                    ) {
                      graphRef.current.centerAt(
                        memoryNode.x,
                        memoryNode.y,
                        memoryNode.z,
                        1000
                      )

                      graphRef.current.zoom(1.5, 1000)
                    }
                  }
                }}
              >
                <p className='result-content'>{memory.content}</p>
                <div className='result-meta'>
                  <span className='result-date'>
                    {new Date(memory.timestamp).toLocaleString()}
                  </span>
                  <span className={`result-emotion ${memory.emotionalTone}`}>
                    {memory.emotionalTone}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Wrapped with provider
const MemoryVisualization: React.FC = () => (
  <AICompanionProvider>
    <MemoryVisualizationContent />
  </AICompanionProvider>
)

export default MemoryVisualization
