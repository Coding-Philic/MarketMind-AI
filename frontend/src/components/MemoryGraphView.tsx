import React, { useState, useEffect, useRef } from 'react';
import { Network, ZoomIn, ZoomOut, RotateCcw, Filter, Eye, Activity } from 'lucide-react';
import { MemoryNode, MemoryEdge, Company, HindsightRecord } from '../types';

interface MemoryGraphViewProps {
  nodes: MemoryNode[];
  edges: MemoryEdge[];
  hindsightLedger?: HindsightRecord[];
  companies?: Company[];
}

interface PhysicsNode extends MemoryNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  isDragging?: boolean;
}

export const MemoryGraphView: React.FC<MemoryGraphViewProps> = ({ nodes, edges, hindsightLedger = [], companies = [] }) => {
  const width = 1600;
  const height = 960;
  const containerRef = useRef<SVGSVGElement>(null);

  // Physics Simulation State
  const [simNodes, setSimNodes] = useState<PhysicsNode[]>([]);
  const [selectedNode, setSelectedNode] = useState<PhysicsNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  // UI Filters
  const [filterGroups, setFilterGroups] = useState<Record<string, boolean>>({
    sector: true,
    company: true,
    product: true,
    hindsight_lesson: true,
    event: true
  });

  // Pan and Zoom
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0 });

  // Dragging Nodes
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);

  // Initialize nodes with layout coordinates if not present
  useEffect(() => {
    // Keep existing coordinates if nodes match, otherwise seed
    setSimNodes((prev) => {
      return nodes.map((node, index) => {
        const existing = prev.find(p => p.id === node.id);
        if (existing) {
          return { ...existing, label: node.label, detail: node.detail, group: node.group, importance: node.importance };
        }
        // Seed nodes in a spiral layout
        const angle = index * 0.4;
        const radius = 60 + index * 18;
        return {
          ...node,
          x: width / 2 + Math.cos(angle) * radius,
          y: height / 2 + Math.sin(angle) * radius,
          vx: 0,
          vy: 0
        };
      });
    });
  }, [nodes]);

  // Force-directed layout tick
  useEffect(() => {
    if (simNodes.length === 0) return;

    let animFrameId: number;
    const tick = () => {
      setSimNodes((prevNodes) => {
        // Create lookup map for fast edge calculations
        const nodeMap = new Map(prevNodes.map(n => [n.id, n]));

        // Clone nodes for updates
        const nextNodes = prevNodes.map(n => ({ ...n }));

        // 1. Repulsion between all nodes (Coulomb-like)
        for (let i = 0; i < nextNodes.length; i++) {
          const n1 = nextNodes[i];
          if (n1.id === draggedNodeId) continue;

          for (let j = i + 1; j < nextNodes.length; j++) {
            const n2 = nextNodes[j];

            const dx = n2.x - n1.x;
            const dy = n2.y - n1.y;
            const distSq = dx * dx + dy * dy || 1;
            const dist = Math.sqrt(distSq);

            if (dist < 480) {
              // Push force inversely proportional to distance
              const force = 150 / distSq;
              const fx = (dx / dist) * force;
              const fy = (dy / dist) * force;

              if (n1.id !== draggedNodeId) {
                n1.vx -= fx;
                n1.vy -= fy;
              }
              if (n2.id !== draggedNodeId) {
                n2.vx += fx;
                n2.vy += fy;
              }
            }
          }
        }

        // 2. Attraction along edges (Hooke's law)
        edges.forEach((edge) => {
          const sourceNode = nextNodes.find(n => n.id === edge.source);
          const targetNode = nextNodes.find(n => n.id === edge.target);

          if (sourceNode && targetNode) {
            const dx = targetNode.x - sourceNode.x;
            const dy = targetNode.y - sourceNode.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;

            // Rest length of edge is proportional to weight
            const restLength = 180 - edge.weight * 15;
            const k = 0.012; // Spring constant
            const force = (dist - restLength) * k;

            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;

            if (sourceNode.id !== draggedNodeId) {
              sourceNode.vx += fx;
              sourceNode.vy += fy;
            }
            if (targetNode.id !== draggedNodeId) {
              targetNode.vx -= fx;
              targetNode.vy -= fy;
            }
          }
        });

        // 3. Gravity/Center gravity pull & bounds friction
        nextNodes.forEach((node) => {
          if (node.id === draggedNodeId) return;

          // Pull to center
          const dx = width / 2 - node.x;
          const dy = height / 2 - node.y;
          node.vx += dx * 0.00035;
          node.vy += dy * 0.00035;

          // Update position with velocity
          node.x += node.vx;
          node.y += node.vy;

          // Friction damping
          node.vx *= 0.88;
          node.vy *= 0.88;

          // Bounds constraints
          const padding = 30;
          if (node.x < padding) { node.x = padding; node.vx = 0; }
          if (node.x > width - padding) { node.x = width - padding; node.vx = 0; }
          if (node.y < padding) { node.y = padding; node.vy = 0; }
          if (node.y > height - padding) { node.y = height - padding; node.vy = 0; }
        });

        return nextNodes;
      });

      animFrameId = requestAnimationFrame(tick);
    };

    animFrameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animFrameId);
  }, [edges, draggedNodeId, simNodes.length]);

  // Handle Dragging Events
  const handleMouseDown = (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDraggedNodeId(nodeId);
    setSelectedNode(simNodes.find(n => n.id === nodeId) || null);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggedNodeId) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        // Convert screen mouse to SVG canvas space (taking pan and zoom into account)
        const mouseX = (e.clientX - rect.left - pan.x) / zoom;
        const mouseY = (e.clientY - rect.top - pan.y) / zoom;

        setSimNodes((prev) =>
          prev.map((n) => (n.id === draggedNodeId ? { ...n, x: mouseX, y: mouseY, vx: 0, vy: 0 } : n))
        );
      }
    } else if (isPanning) {
      const dx = e.clientX - panStart.current.x;
      const dy = e.clientY - panStart.current.y;
      setPan({ x: pan.x + dx, y: pan.y + dy });
      panStart.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleMouseUp = () => {
    setDraggedNodeId(null);
    setIsPanning(false);
  };

  // Canvas Pan Trigger
  const handleBgMouseDown = (e: React.MouseEvent) => {
    setIsPanning(true);
    panStart.current = { x: e.clientX, y: e.clientY };
  };

  // Zoom Actions
  const zoomIn = () => setZoom(z => Math.min(2.5, z + 0.15));
  const zoomOut = () => setZoom(z => Math.max(0.4, z - 0.15));
  const resetLayout = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setSelectedNode(null);
  };

  // Toggle Filters
  const toggleFilter = (group: string) => {
    setFilterGroups(prev => ({ ...prev, [group]: !prev[group] }));
  };

  // ---------------------------------------------------------------------------
  // Memory Health Index — Dynamic formula-based score (0–100)
  // ---------------------------------------------------------------------------
  const computeMemoryHealth = (): { score: number; label: string; color: string; breakdown: string[] } => {
    if (nodes.length === 0) return { score: 0, label: 'No Data', color: '#475569', breakdown: ['No memory nodes found. Add companies or inject events to build memory.'] };

    const breakdown: string[] = [];

    // Metric 1: Node Coverage — do companies have memory nodes? (30 pts)
    const companyNodeIds = companies.map(c => `co-${c.id}`);
    const coveredCompanies = companyNodeIds.filter(id => nodes.some(n => n.id === id)).length;
    const coverageScore = companies.length > 0
      ? Math.round((coveredCompanies / companies.length) * 30)
      : nodes.length > 0 ? 20 : 0;
    breakdown.push(`Company Coverage: ${coveredCompanies}/${Math.max(companies.length, 1)} companies mapped (${coverageScore}/30 pts)`);

    // Metric 2: Edge Density — how well connected is the graph? (25 pts)
    const edgesPerNode = nodes.length > 0 ? edges.length / nodes.length : 0;
    const densityScore = Math.min(Math.round(edgesPerNode * 10), 25);
    breakdown.push(`Edge Density: ${edges.length} edges across ${nodes.length} nodes — ${edgesPerNode.toFixed(1)} links/node (${densityScore}/25 pts)`);

    // Metric 3: Hindsight Integration — are lessons present in graph? (25 pts)
    const hindsightNodeCount = nodes.filter(n => n.group === 'hindsight_lesson' || (n.group as string) === 'theme').length;
    const hindsightIntScore = nodes.length > 0
      ? Math.min(Math.round((hindsightNodeCount / nodes.length) * 40), 25)
      : 0;
    breakdown.push(`Hindsight Integration: ${hindsightNodeCount} lesson/theme nodes (${hindsightIntScore}/25 pts)`);

    // Metric 4: Memory Freshness — recent event nodes present? (20 pts)
    const eventNodes = nodes.filter(n => n.group === 'event');
    const freshnessScore = Math.min(Math.round((eventNodes.length / 5) * 20), 20);
    breakdown.push(`Memory Freshness: ${eventNodes.length} event nodes in graph (${freshnessScore}/20 pts)`);

    const total = coverageScore + densityScore + hindsightIntScore + freshnessScore;

    let label: string;
    let color: string;
    if (total >= 90) { label = 'Excellent'; color = '#10b981'; }
    else if (total >= 70) { label = 'Good'; color = '#06b6d4'; }
    else if (total >= 40) { label = 'Fair'; color = '#f59e0b'; }
    else { label = 'Critical'; color = '#ef4444'; }

    return { score: total, label, color, breakdown };
  };

  const health = computeMemoryHealth();
  const [showHealthBreakdown, setShowHealthBreakdown] = React.useState(false);


  // Filter nodes & edges
  const filteredNodes = simNodes.filter(n => filterGroups[n.group]);
  const filteredEdges = edges.filter(edge => {
    const src = simNodes.find(n => n.id === edge.source);
    const tgt = simNodes.find(n => n.id === edge.target);
    return src && tgt && filterGroups[src.group] && filterGroups[tgt.group];
  });

  // Compute connected and 2nd degree connected nodes for inspector and highlighting
  const getConnectedDetails = () => {
    const focusNode = selectedNode || (hoveredNode ? simNodes.find(n => n.id === hoveredNode) : null);
    if (!focusNode) return { direct: [], secondDegree: [], directIds: new Set<string>(), secondDegreeIds: new Set<string>() };

    const direct: Array<{ node: PhysicsNode; edgeLabel: string }> = [];
    const directIds = new Set<string>();

    edges.forEach(e => {
      if (e.source === focusNode.id) {
        const targetNode = simNodes.find(n => n.id === e.target);
        if (targetNode && !directIds.has(targetNode.id)) {
          direct.push({ node: targetNode, edgeLabel: e.label || e.type });
          directIds.add(targetNode.id);
        }
      } else if (e.target === focusNode.id) {
        const sourceNode = simNodes.find(n => n.id === e.source);
        if (sourceNode && !directIds.has(sourceNode.id)) {
          direct.push({ node: sourceNode, edgeLabel: e.label || e.type });
          directIds.add(sourceNode.id);
        }
      }
    });

    const secondDegree: Array<{ node: PhysicsNode; viaNodeName: string }> = [];
    const secondDegreeIds = new Set<string>();

    edges.forEach(e => {
      if (directIds.has(e.source) && e.target !== focusNode.id && !directIds.has(e.target) && !secondDegreeIds.has(e.target)) {
        const targetNode = simNodes.find(n => n.id === e.target);
        const viaNode = simNodes.find(n => n.id === e.source);
        if (targetNode && viaNode) {
          secondDegree.push({ node: targetNode, viaNodeName: viaNode.label });
          secondDegreeIds.add(targetNode.id);
        }
      } else if (directIds.has(e.target) && e.source !== focusNode.id && !directIds.has(e.source) && !secondDegreeIds.has(e.source)) {
        const sourceNode = simNodes.find(n => n.id === e.source);
        const viaNode = simNodes.find(n => n.id === e.target);
        if (sourceNode && viaNode) {
          secondDegree.push({ node: sourceNode, viaNodeName: viaNode.label });
          secondDegreeIds.add(sourceNode.id);
        }
      }
    });

    return { direct, secondDegree, directIds, secondDegreeIds };
  };

  const { direct: directConnections, secondDegree: secondDegreeConnections, directIds, secondDegreeIds } = getConnectedDetails();

  // Check connection highlighting (1st degree and 2nd degree)
  const getConnectionLevel = (nodeId: string): number => {
    const focusId = hoveredNode || selectedNode?.id;
    if (!focusId) return 0; // all active when nothing selected/hovered
    if (nodeId === focusId) return 0;
    if (directIds.has(nodeId)) return 1;
    if (secondDegreeIds.has(nodeId)) return 2;
    return -1;
  };

  const isConnected = (nodeId: string) => {
    return getConnectionLevel(nodeId) !== -1;
  };

  // Node Color Schema
  const getNodeColor = (group: string, active: boolean) => {
    const opacity = active ? '1.0' : '0.25';
    switch (group) {
      case 'sector': return `rgba(16, 185, 129, ${opacity})`; // Emerald
      case 'company': return `rgba(99, 102, 241, ${opacity})`; // Indigo
      case 'product': return `rgba(168, 85, 247, ${opacity})`; // Violet
      case 'hindsight_lesson': return `rgba(245, 158, 11, ${opacity})`; // Amber
      case 'event': return `rgba(244, 63, 94, ${opacity})`; // Rose
      default: return `rgba(148, 163, 184, ${opacity})`;
    }
  };

  return (
    <div>
      {/* View Header */}
      <div className="top-nav">
        <h1 className="page-title">Long-Term Memory Network</h1>
        <div style={styles.controlsBar}>
          <button onClick={zoomIn} style={styles.controlBtn} className="glass-panel-interactive"><ZoomIn size={16} /></button>
          <button onClick={zoomOut} style={styles.controlBtn} className="glass-panel-interactive"><ZoomOut size={16} /></button>
          <button onClick={resetLayout} style={styles.controlBtn} className="glass-panel-interactive"><RotateCcw size={16} /></button>
        </div>
      </div>

      <div style={styles.layoutWrapper}>
        {/* Sidebar filters */}
        <div style={styles.filtersPane} className="glass-panel">
          <div style={styles.filterTitle}>
            <Filter size={16} color="#6366f1" />
            <h3>Filter Memory Categories</h3>
          </div>

          <div style={styles.filterList}>
            {Object.entries(filterGroups).map(([group, checked]) => (
              <label key={group} style={styles.filterItem}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleFilter(group)}
                  style={styles.checkbox}
                />
                <span style={{
                  color: checked ? '#f1f5f9' : '#475569',
                  textTransform: 'capitalize',
                  fontSize: '0.88rem'
                }}>
                  {group.replace('_', ' ')}
                </span>
                <span style={{
                  ...styles.legendDot,
                  backgroundColor: getNodeColor(group, true)
                }}></span>
              </label>
            ))}
          </div>

          {/* Details Inspector */}
          {selectedNode ? (
            <div style={{ ...styles.inspector, maxHeight: '520px', overflowY: 'auto' }} className="glass-panel">
              <div style={{ paddingBottom: '12px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', marginBottom: '12px' }}>
                <h4 style={styles.inspectorTitle}>{selectedNode.label}</h4>
                <span style={{
                  ...styles.inspectorBadge,
                  backgroundColor: getNodeColor(selectedNode.group, true).replace('1.0', '0.15'),
                  color: getNodeColor(selectedNode.group, true)
                }}>
                  {selectedNode.group.replace('_', ' ').toUpperCase()}
                </span>
                <p style={styles.inspectorDetail}>{selectedNode.detail}</p>
                <div style={styles.inspectorMeta}>
                  <span>Degree: {directConnections.length} direct links</span>
                </div>
              </div>

              {/* Directly Connected Circles (1st Degree) */}
              {directConnections.length > 0 && (
                <div style={{ marginBottom: '14px' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.05em', marginBottom: '8px' }}>
                    DIRECTLY CONNECTED CIRCLES ({directConnections.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {directConnections.map(({ node, edgeLabel }, idx) => (
                      <div
                        key={idx}
                        onClick={() => setSelectedNode(node)}
                        style={{
                          padding: '8px 10px',
                          borderRadius: '8px',
                          background: 'rgba(255, 255, 255, 0.03)',
                          border: '1px solid rgba(255, 255, 255, 0.06)',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#f1f5f9' }}>{node.label}</span>
                          <span style={{
                            fontSize: '0.62rem',
                            fontWeight: 700,
                            padding: '1px 5px',
                            borderRadius: '3px',
                            backgroundColor: getNodeColor(node.group, true).replace('1.0', '0.15'),
                            color: getNodeColor(node.group, true)
                          }}>
                            {node.group.replace('_', ' ').toUpperCase()}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#6366f1', fontStyle: 'italic', marginBottom: '4px' }}>
                          Relation: {edgeLabel}
                        </div>
                        <p style={{ fontSize: '0.74rem', color: '#64748b', margin: 0, lineHeight: '1.3' }}>
                          {node.detail?.substring(0, 90)}{node.detail && node.detail.length > 90 ? '...' : ''}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Connected to Connected Circles (2nd Degree) */}
              {secondDegreeConnections.length > 0 && (
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.05em', marginBottom: '8px' }}>
                    CONNECTED TO CONNECTED CIRCLES ({secondDegreeConnections.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {secondDegreeConnections.map(({ node, viaNodeName }, idx) => (
                      <div
                        key={idx}
                        onClick={() => setSelectedNode(node)}
                        style={{
                          padding: '8px 10px',
                          borderRadius: '8px',
                          background: 'rgba(255, 255, 255, 0.02)',
                          border: '1px dashed rgba(255, 255, 255, 0.05)',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#e2e8f0' }}>{node.label}</span>
                          <span style={{
                            fontSize: '0.62rem',
                            fontWeight: 700,
                            padding: '1px 5px',
                            borderRadius: '3px',
                            backgroundColor: getNodeColor(node.group, true).replace('1.0', '0.15'),
                            color: getNodeColor(node.group, true)
                          }}>
                            {node.group.replace('_', ' ').toUpperCase()}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#06b6d4', marginBottom: '4px' }}>
                          Linked via: <strong style={{ color: '#cbd5e1' }}>{viaNodeName}</strong>
                        </div>
                        <p style={{ fontSize: '0.74rem', color: '#64748b', margin: 0, lineHeight: '1.3' }}>
                          {node.detail?.substring(0, 90)}{node.detail && node.detail.length > 90 ? '...' : ''}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={styles.emptyInspector}>
              <Eye size={20} color="#475569" style={{ marginBottom: '6px' }} />
              <p>Click a memory node to inspect associated linkages.</p>
            </div>
          )}

          {/* Memory Health Index */}
          <div
            onClick={() => setShowHealthBreakdown(b => !b)}
            style={{
              marginTop: '12px',
              padding: '14px',
              borderRadius: '10px',
              border: `1px solid ${health.color}33`,
              background: `${health.color}0d`,
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Activity size={14} color={health.color} />
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', letterSpacing: '0.06em' }}>MEMORY HEALTH INDEX</span>
            </div>
            {/* Score ring + label */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '48px', height: '48px', borderRadius: '50%',
                background: `conic-gradient(${health.color} ${health.score * 3.6}deg, rgba(255,255,255,0.05) 0deg)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: `0 0 12px ${health.color}44`
              }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#04060f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: health.color }}>{health.score}</span>
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: health.color }}>{health.label}</div>
                <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{health.score}/100 pts · tap to expand</div>
              </div>
            </div>
            {/* Breakdown */}
            {showHealthBreakdown && (
              <div style={{ marginTop: '10px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                {health.breakdown.map((line, i) => (
                  <p key={i} style={{ fontSize: '0.72rem', color: '#64748b', lineHeight: '1.4', margin: 0 }}>{line}</p>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* SVG Canvas Area */}
        <div style={styles.canvasContainer} className="glass-panel">
          <svg
            ref={containerRef}
            width={width}
            height={height}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onMouseDown={handleBgMouseDown}
            style={{
              cursor: isPanning ? 'grabbing' : 'grab',
              background: '#04060f',
              borderRadius: '12px'
            }}
          >
            {/* Background grid lines */}
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255, 255, 255, 0.015)" strokeWidth="1" />
              </pattern>

              {/* Node glow filters */}
              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="6" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />

            {/* Transform Group (Zoom and Pan) */}
            <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>

              {/* Link Edges */}
              {filteredEdges.map((edge) => {
                const source = filteredNodes.find(n => n.id === edge.source);
                const target = filteredNodes.find(n => n.id === edge.target);

                if (!source || !target) return null;

                const focusId = hoveredNode || selectedNode?.id;
                const isMuted = focusId ? !(
                  edge.source === focusId || edge.target === focusId ||
                  (directIds.has(edge.source) && (directIds.has(edge.target) || secondDegreeIds.has(edge.target))) ||
                  (directIds.has(edge.target) && (directIds.has(edge.source) || secondDegreeIds.has(edge.source)))
                ) : false;

                return (
                  <g key={edge.id}>
                    <line
                      x1={source.x}
                      y1={source.y}
                      x2={target.x}
                      y2={target.y}
                      stroke={edge.type === 'contradicts' ? 'rgba(244, 63, 94, 0.4)' : 'rgba(255, 255, 255, 0.07)'}
                      strokeWidth={isMuted ? 0.8 : edge.weight + 0.5}
                      strokeDasharray={edge.type === 'contradicts' ? '4,4' : 'none'}
                      opacity={isMuted ? 0.15 : 1}
                      style={{ transition: 'all 0.25s ease' }}
                    />
                    {/* Small link label indicator */}
                    {!isMuted && (
                      <text
                        x={(source.x + target.x) / 2}
                        y={(source.y + target.y) / 2 - 4}
                        fill="rgba(148, 163, 184, 0.45)"
                        fontSize="7"
                        textAnchor="middle"
                        fontFamily="monospace"
                      >
                        {edge.label}
                      </text>
                    )}
                  </g>
                );
              })}

              {/* Node Circles */}
              {filteredNodes.map((node) => {
                const focusId = hoveredNode || selectedNode?.id;
                const level = getConnectionLevel(node.id);
                const isMuted = focusId ? level === -1 : false;
                const nodeColor = getNodeColor(node.group, !isMuted);
                const radius = 10 + (node.importance || 5) * 1.5;
                const isCurrentSelected = selectedNode?.id === node.id;
                const nodeOpacity = focusId ? (level === 0 ? 1 : level === 1 ? 1 : level === 2 ? 0.85 : 0.25) : 1;

                return (
                  <g
                    key={node.id}
                    transform={`translate(${node.x}, ${node.y})`}
                    style={{ transition: 'opacity 0.25s ease' }}
                    opacity={nodeOpacity}
                  >
                    {/* Glowing outer shadow ring */}
                    {(node.group === 'hindsight_lesson' || node.group === 'company') && !isMuted && (
                      <circle
                        r={radius + 6}
                        fill="transparent"
                        stroke={nodeColor}
                        strokeWidth="1.5"
                        strokeDasharray="4,4"
                        style={{
                          animation: 'pulse-glow 2s infinite alternate',
                          transformOrigin: 'center'
                        }}
                        opacity="0.4"
                      />
                    )}

                    {/* Active highlight ring */}
                    {isCurrentSelected && (
                      <circle
                        r={radius + 4}
                        fill="none"
                        stroke="#6366f1"
                        strokeWidth="2"
                        filter="url(#glow)"
                      />
                    )}

                    {/* Core node body */}
                    <circle
                      r={radius}
                      fill={nodeColor}
                      stroke={isCurrentSelected ? '#ffffff' : 'rgba(2, 4, 8, 0.9)'}
                      strokeWidth={isCurrentSelected ? 2 : 1.5}
                      onMouseDown={(e) => handleMouseDown(node.id, e)}
                      onMouseEnter={() => setHoveredNode(node.id)}
                      onMouseLeave={() => setHoveredNode(null)}
                      style={{ cursor: 'pointer' }}
                    />

                    {/* Text labels */}
                    <text
                      y={radius + 15}
                      fill={isMuted ? 'rgba(148,163,184,0.35)' : '#cbd5e1'}
                      fontSize="9"
                      fontWeight={node.group === 'company' ? 'bold' : 'normal'}
                      textAnchor="middle"
                      style={{ pointerEvents: 'none', userSelect: 'none' }}
                    >
                      {node.label}
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>
        </div>
      </div>
    </div>
  );
};

const styles = {
  controlsBar: {
    display: 'flex',
    gap: '8px',
  },
  controlBtn: {
    background: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    color: '#cbd5e1',
    width: '32px',
    height: '32px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  layoutWrapper: {
    display: 'flex',
    gap: '24px',
    alignItems: 'stretch',
    flexWrap: 'wrap' as const,
  },
  filtersPane: {
    flex: '1 1 240px',
    padding: '18px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
  },
  filterTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
    paddingBottom: '10px',
  },
  filterList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px',
  },
  filterItem: {
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer',
    position: 'relative' as const,
  },
  checkbox: {
    marginRight: '10px',
    cursor: 'pointer',
  },
  legendDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    marginLeft: 'auto',
  },
  inspector: {
    marginTop: 'auto',
    padding: '14px',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: 'rgba(99, 102, 241, 0.15)',
    background: 'rgba(0, 0, 0, 0.2)',
  },
  inspectorTitle: {
    fontSize: '0.95rem',
    fontWeight: 600,
    color: '#f8fafc',
    marginBottom: '4px',
  },
  inspectorBadge: {
    padding: '2px 6px',
    borderRadius: '4px',
    fontSize: '0.65rem',
    fontWeight: 700,
    display: 'inline-block',
    marginBottom: '8px',
  },
  inspectorDetail: {
    fontSize: '0.8rem',
    color: '#94a3b8',
    lineHeight: '1.4',
  },
  inspectorMeta: {
    marginTop: '8px',
    fontSize: '0.72rem',
    color: '#475569',
    textAlign: 'right' as const,
  },
  emptyInspector: {
    marginTop: 'auto',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center' as const,
    padding: '16px 12px',
    color: '#475569',
    fontSize: '0.78rem',
    border: '1px dashed rgba(255, 255, 255, 0.04)',
    borderRadius: '8px',
  },
  canvasContainer: {
    flex: '3 1 750px',
    minHeight: '750px',
    padding: '6px',
    overflow: 'auto',
  }
};
