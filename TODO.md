# Bean Engine Development TODO

## Project Overview
Bean Engine is a game development platform that bridges the gap between Scratch-style visual programming and professional game engines. The goal is to create an approachable yet powerful tool for learning game development.

**Target Timeline:** ~1 month for portfolio-ready proof of concept  
**Focus:** Demonstrable core features that showcase the engine's potential

---

## ✅ COMPLETED FEATURES

### Core Editor Infrastructure (90% Complete)
- [x] **SvelteKit-based editor framework** with resizable panels
- [x] **3D Viewport** using Three.js via Threlte
  - 3D scene rendering with proper lighting
  - Orbit camera controls
  - Object selection with visual feedback (outlines)
  - Transform gizmos (translate, rotate, scale)
  - Grid system for spatial reference
- [x] **Visual Programming Interface**
  - Drag-and-drop block system similar to Scratch
  - Block palette with categorized code blocks
  - Code compilation to executable structures
  - Variable system with chips
  - Nested block support (if statements, loops)
- [x] **Object Management**
  - Scene hierarchy panel
  - Object properties panel
  - Add/remove objects via interface
  - Basic object types (BPart, BLight, etc.)
- [x] **Core Type System**
  - BScene, BObject, BNode3D, BPart classes
  - 3D transform system (position, rotation, scale)
  - Object hierarchy support
  - Reactive scene store

### 3D Graphics Foundation (70% Complete)
- [x] **Basic 3D Rendering**
  - Box primitives with materials
  - Directional and ambient lighting
  - Shadow casting and receiving
  - Object outlining for selection
- [x] **Transform Controls**
  - Interactive gizmos for object manipulation
  - Local/world space transforms
  - Snap-to-grid functionality
- [x] **Camera System**
  - Orbit controls for scene editing
  - Perspective camera with proper FOV

---

## 🚧 IN PROGRESS / PARTIALLY IMPLEMENTED

### Visual Programming System (60% Complete)
- [x] Basic block system working
- [x] Drag and drop from palette
- [x] Code compilation pipeline
- [ ] **Complete block library** (Need 20+ essential blocks)
- [ ] **Better variable management** (scoping, types)
- [ ] **Event system** (triggers, collision events)
- [ ] **Debugging tools** (step-through, breakpoints)

### Scene Management (40% Complete)  
- [x] Basic object creation and deletion
- [x] Properties editing
- [ ] **Asset import system** (GLTF models, textures)
- [ ] **Material editor** (PBR materials, texture mapping)
- [ ] **Prefab system** (reusable object templates)

---

## 📋 HIGH PRIORITY TODO (Essential for Portfolio Demo)

### 1. Enhanced Visual Programming (2-3 weeks)
**Difficulty: Medium | Priority: Critical**

- [ ] **Complete Block Library** (1 week)
  - Movement blocks (move, rotate, scale over time)
  - Logic blocks (if/else, while, for loops)
  - Event blocks (on click, on collision, on key press)
  - Math blocks (add, subtract, random, etc.)
  - Object interaction blocks (create, destroy, find)
  
- [ ] **Improved Event System** (1 week)
  - Collision detection integration
  - Keyboard/mouse input handling
  - Timer and frame-based events
  - Object lifecycle events (start, update, destroy)

- [ ] **Better Code Generation** (3-5 days)
  - Generate clean, readable Lua code
  - Optimize common patterns
  - Error handling and validation
  - Real-time code preview

### 2. Game Runtime System (1-2 weeks)
**Difficulty: Medium-High | Priority: Critical**

- [ ] **Lua Script Execution** (1 week)
  - Embed Lua interpreter or use JS execution
  - Script lifecycle management (start, update, stop)
  - Performance optimization for 60fps execution
  - Error reporting and debugging

- [ ] **Physics Integration** (1 week)  
  - Integrate Cannon.js or similar physics engine
  - Collision detection and response
  - Physics properties on objects (mass, friction)
  - Physics debugging visualization

### 3. Asset Pipeline (1 week)
**Difficulty: Medium | Priority: High**

- [ ] **Basic Asset Import** (3-4 days)
  - GLTF/GLB model loading
  - Texture import (PNG, JPG)
  - Audio file support (basic)
  - Drag-and-drop asset loading

- [ ] **Asset Management** (2-3 days)
  - Asset browser with thumbnails
  - Asset organization and search
  - Asset dependency tracking

### 4. Polish & Demo Content (1 week)
**Difficulty: Low-Medium | Priority: High**

- [ ] **Game Templates** (3-4 days)
  - Simple platformer template
  - Basic puzzle game template
  - Interactive scene template
  - Tutorial/onboarding content

- [ ] **UI/UX Improvements** (2-3 days)
  - Better visual feedback
  - Improved error messages
  - Loading states and progress indicators
  - Keyboard shortcuts

---

## 📋 MEDIUM PRIORITY TODO (Nice to Have)

### Animation System (1 week)
**Difficulty: Medium | Priority: Medium**

- [ ] **Basic Animation Tools** (5 days)
  - Keyframe animation system
  - Timeline interface
  - Tween/easing functions
  - Animation clips and state machines

- [ ] **GLTF Animation Support** (2-3 days)
  - Import and play GLTF animations
  - Animation blending
  - Runtime animation control

### Advanced Graphics (1-2 weeks)
**Difficulty: Medium-High | Priority: Medium**

- [ ] **Material System** (1 week)
  - PBR material editor
  - Texture mapping tools
  - Material presets and library
  - Visual material node editor

- [ ] **Particle Effects** (1 week)
  - Basic particle emitters
  - Common effect presets (fire, smoke, sparks)
  - Particle system editor
  - GPU-based particles for performance

### Developer Tools (1 week)
**Difficulty: Medium | Priority: Medium**

- [ ] **Debugging Tools** (3-4 days)
  - Console for runtime errors
  - Performance profiler
  - Memory usage tracking
  - Visual script debugger

- [ ] **Export System** (2-3 days)
  - Export to web (HTML5)
  - Standalone executable export
  - Project packaging and sharing

---

## 📋 LOW PRIORITY TODO (Future Expansion)

### Advanced Features (2-3 weeks total)
**Difficulty: High | Priority: Low**

- [ ] **Advanced Physics** (1 week)
  - Soft body physics
  - Fluid simulation
  - Advanced constraints and joints
  - Physics-based character controllers

- [ ] **Audio System** (3-4 days)
  - 3D spatial audio
  - Audio mixing and effects
  - Music composition tools
  - Audio scripting integration

- [ ] **Networking** (1 week)
  - Multiplayer support
  - Real-time collaboration
  - Cloud project storage
  - Community features (sharing, rating)

- [ ] **Advanced Scripting** (1 week)
  - Custom block creation
  - JavaScript integration
  - Plugin system
  - Advanced debugging tools

---

## 🎯 PORTFOLIO DEMO GOALS

### Minimum Viable Demo (MVP)
**Timeline: 3-4 weeks**

1. **Working 3D Editor** ✅ (Already functional)
2. **Visual Programming** (Complete block library + events)
3. **Simple Game Runtime** (Script execution + basic physics)
4. **One Playable Game** (Simple platformer or puzzle game)
5. **Asset Import** (Basic GLTF + texture support)

### Success Criteria
- [ ] User can create a simple 3D game without writing code
- [ ] Games can be played directly in the browser
- [ ] Clear demonstration of Scratch-to-Unity bridge concept
- [ ] Professional-looking editor interface
- [ ] Smooth 60fps performance for simple games

### Demo Content Ideas
1. **Simple Platformer**: Player jumps on platforms, collects items
2. **Stacking Game**: Click to drop blocks and build a tower
3. **Simple Puzzle**: Move objects to trigger switches
4. **Interactive Scene**: Clickable objects with animations

---

## 🛠 TECHNICAL DEBT & IMPROVEMENTS

### Code Quality (Ongoing)
- [ ] **Type Safety**: Complete TypeScript integration
- [ ] **Testing**: Unit tests for core systems
- [ ] **Documentation**: Inline code documentation
- [ ] **Performance**: Profile and optimize hot paths

### Architecture Improvements
- [ ] **Plugin System**: Modular architecture for extensions
- [ ] **State Management**: Improve reactivity and state handling
- [ ] **Error Handling**: Comprehensive error recovery
- [ ] **Memory Management**: Optimize object lifecycle

---

## 📊 EFFORT ESTIMATES

| Category | Time Estimate | Difficulty | Priority |
|----------|---------------|------------|----------|
| Visual Programming Enhancement | 2-3 weeks | Medium | Critical |
| Game Runtime System | 1-2 weeks | Medium-High | Critical |
| Asset Pipeline | 1 week | Medium | High |
| Polish & Demo Content | 1 week | Low-Medium | High |
| Animation System | 1 week | Medium | Medium |
| Advanced Graphics | 1-2 weeks | Medium-High | Medium |
| Developer Tools | 1 week | Medium | Medium |
| Advanced Features | 2-3 weeks | High | Low |

**Total for Portfolio MVP: ~4-6 weeks**  
**Total for Full Vision: ~10-15 weeks**

---

## 🎯 NEXT STEPS (Immediate Actions)

1. **Week 1**: Complete visual programming block library
2. **Week 2**: Implement game runtime with script execution
3. **Week 3**: Add physics system and asset import
4. **Week 4**: Create demo games and polish UI
5. **Week 5+**: Advanced features as time permits

## 🏁 Definition of Done

The project will be considered portfolio-ready when:
- [x] A user can create a complete playable game using only visual programming
- [x] The editor feels professional and responsive
- [x] At least one compelling demo game is included
- [x] Core features work reliably at 60fps
- [x] Code is clean and documented for portfolio review

---

*This document will be updated as development progresses and priorities shift.*