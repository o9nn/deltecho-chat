import React, { useEffect, useState, useRef, useCallback } from 'react'
import ForceGraph2D, { ForceGraphMethods } from 'react-force-graph-2d'
import { getLogger } from '@deltachat-desktop/shared/logger'

const log = getLogger('frontend/components/ScientificGenius/KnowledgeGraph')

interface GraphNode {
    id: string
    name: string
    group: number // 1 for ConceptNode, 2 for Links
    val: number // size
    color?: string
}

interface GraphLink {
    source: string
    target: string
    label?: string
    color?: string
}

interface GraphData {
    nodes: GraphNode[]
    links: GraphLink[]
}

export const KnowledgeGraph: React.FC = () => {
    const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] })
    const fgRef = useRef<ForceGraphMethods>()
    const containerRef = useRef<HTMLDivElement>(null)
    const [dimensions, setDimensions] = useState({ width: 800, height: 600 })

    useEffect(() => {
        // Handle resize
        const updateDimensions = () => {
            if (containerRef.current) {
                setDimensions({
                    width: containerRef.current.clientWidth,
                    height: containerRef.current.clientHeight
                })
            }
        }

        window.addEventListener('resize', updateDimensions)
        updateDimensions()

        return () => window.removeEventListener('resize', updateDimensions)
    }, [])

    useEffect(() => {
        const executor = (window as any).deepTreeEchoExecutor
        if (!executor) {
            log.warn('AgentToolExecutor not found on window')
            return
        }

        // Initial fetch of atoms (Using the query_knowledge tool abstraction manually or just starting fresh)
        // For now, we start fresh and listen for updates.
        // In a real implementation, we'd fetch all existing atoms from DB.

        const unsubscribe = executor.subscribe((event: any) => {
            if (event.type === 'knowledge_stored') {
                const { atom, type } = event.data
                // Parse atom string: e.g., (InheritanceLink (ConceptNode "A") (ConceptNode "B"))
                // This is a naive parser for visualization purposes

                // Helper to extract name from ConceptNode "Name"
                const extractName = (str: string) => {
                    const match = str.match(/"([^"]+)"/)
                    return match ? match[1] : str
                }

                log.info('Visualizing atom:', atom)

                setGraphData(prev => {
                    const newNodes = [...prev.nodes]
                    const newLinks = [...prev.links]

                    // Naive parsing logic for specific Link types we care about
                    if (type === 'InheritanceLink' || type === 'SimilarityLink') {
                        // usage regex to find source and target nodes
                        // Format: (InheritanceLink (ConceptNode "A") (ConceptNode "B"))
                        const matches = atom.match(/\(ConceptNode "([^"]+)"\)/g)

                        if (matches && matches.length >= 2) {
                            const sourceName = extractName(matches[0])
                            const targetName = extractName(matches[1])

                            // Add nodes if they don't exist
                            if (!newNodes.find(n => n.id === sourceName)) {
                                newNodes.push({ id: sourceName, name: sourceName, group: 1, val: 5, color: '#4facfe' })
                            }
                            if (!newNodes.find(n => n.id === targetName)) {
                                newNodes.push({ id: targetName, name: targetName, group: 1, val: 5, color: '#4facfe' })
                            }

                            // Add link
                            // Check duplication
                            const linkExists = newLinks.some(l =>
                                (l.source === sourceName && l.target === targetName)
                            )

                            if (!linkExists) {
                                newLinks.push({
                                    source: sourceName,
                                    target: targetName,
                                    label: type,
                                    color: type === 'InheritanceLink' ? '#ff0000' : '#00ff00'
                                })
                            }
                        }
                    } else if (type === 'ConceptNode') {
                        const name = extractName(atom)
                        if (!newNodes.find(n => n.id === name)) {
                            newNodes.push({ id: name, name: name, group: 1, val: 5, color: '#4facfe' })
                        }
                    }

                    return { nodes: newNodes, links: newLinks }
                })
            }
        })

        return () => {
            unsubscribe()
        }
    }, [])

    return (
        <div ref={containerRef} style={{ width: '100%', height: '100%', minHeight: '400px', background: '#000011' }}>
            {/* @ts-ignore: Library type definition mismatch */}
            <ForceGraph2D
                ref={fgRef}
                width={dimensions.width}
                height={dimensions.height}
                graphData={graphData}
                nodeLabel="name"
                nodeColor="color"
                linkColor="color"
                linkDirectionalArrowLength={3.5}
                linkDirectionalArrowRelPos={1}
                cooldownTicks={100}
                onEngineStop={() => fgRef.current?.zoomToFit(400)}
            />
        </div>
    )
}
