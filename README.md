# Bean Engine

> A game development platform that bridges the gap between Scratch and professional game engines

# TODO: get custom materials and BMaterial and shi to work

**Bean Engine** is a visual programming game development environment designed for learners transitioning from block-based programming (like Scratch) to real game development. It combines the approachability of visual scripting with the power of 3D graphics and professional game development concepts.

![Bean Engine Landing Page](https://github.com/user-attachments/assets/508387a1-084a-4490-80ba-e762c0f01e97)

_Bean Engine's clean, professional landing page showcasing the project's vision_

![Bean Engine Editor Interface](https://github.com/user-attachments/assets/7b9ccc87-2ae9-4faa-b8df-0e0b5a43dbff)

_The main editor interface with resizable panels, 3D viewport, and professional toolbars_

## 🎯 Project Vision

This is a **portfolio proof-of-concept** demonstrating a complete game development environment that:

-   **Bridges Educational and Professional Tools**: Makes game development accessible without sacrificing capability
-   **Visual Programming First**: Drag-and-drop blocks that generate real, readable code
-   **3D-Ready**: Built-in 3D graphics, physics, and modern rendering
-   **Immediate Feedback**: See your game running in real-time as you build it
-   **Portfolio Quality**: Demonstrates full-stack development, 3D graphics, and complex UI design

## ✨ Current Features

### 🎨 Visual Programming System

-   **Scratch-like Block Interface**: Familiar drag-and-drop programming
-   **Real Code Generation**: Blocks compile to actual game logic
-   **Event-Driven**: Handle clicks, collisions, timers, and more
-   **Variable Management**: Scope-aware variable system with visual chips

### 🎮 3D Game Engine

-   **Modern 3D Graphics**: Three.js powered 3D viewport with PBR rendering
-   **Interactive Viewport**: Move, rotate, and scale objects with visual gizmos
-   **Object Hierarchy**: Professional scene management with parent-child relationships
-   **Physics Ready**: Foundation for collision detection and physics simulation

### 🛠 Professional Editor

-   **Multi-Panel Interface**: Resizable panels for optimal workflow
-   **Asset Management**: Import and organize 3D models, textures, and audio
-   **Properties Editing**: Inspect and modify object properties in real-time
-   **Play Mode**: Test your game instantly without leaving the editor

## 🚀 Getting Started

### Prerequisites

-   Node.js 18+
-   npm or pnpm

### Installation

```bash
# Clone the repository
git clone https://github.com/ratmuds/beanengine
cd beanengine

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser to see the landing page, then click "Start Building" to enter the editor.

### Building for Production

```bash
npm run build
npm run preview
```

## 🎯 Demo Scenarios

### Simple Platformer Game

1. Create a player character that responds to keyboard input
2. Add platforms and collision detection
3. Implement jumping physics and movement
4. Add collectible items and win conditions

### Interactive 3D Scene

1. Place 3D objects in the scene
2. Add click interactions that trigger animations
3. Create moving objects with tween animations
4. Build a simple puzzle or exploration experience

## 🏗 Architecture

### Frontend Stack

-   **SvelteKit**: Modern web framework with server-side rendering
-   **Three.js + Threlte**: 3D graphics and WebGL rendering
-   **TailwindCSS**: Utility-first styling for professional UI
-   **TypeScript**: Type-safe development with modern tooling

### Core Systems

-   **Visual Programming**: Block-based code generation and compilation
-   **3D Scene Management**: Object hierarchy and transform systems
-   **Asset Pipeline**: Import and manage game assets efficiently
-   **Game Runtime**: Execute compiled scripts with physics and events

### Key Components

```
src/
├── routes/
│   ├── editor/           # Main editor interface
│   └── +page.svelte     # Landing page
├── lib/
│   ├── components/      # Reusable UI components
│   ├── types.ts         # Core type definitions
│   ├── sceneStore.ts    # Scene state management
│   └── blockConfig.ts   # Visual programming blocks
```

## 🎨 Design Philosophy

### Approachable Yet Powerful

-   **Visual First**: Complex concepts explained through interactive visuals
-   **Progressive Complexity**: Start simple, reveal advanced features gradually
-   **Real Tools**: Use actual game development concepts, not simplified analogies
-   **Immediate Feedback**: See results instantly, encouraging experimentation

### Educational Bridge

-   **From Scratch to Unity**: Familiar concepts in a more powerful environment
-   **Code Visibility**: Show the real code that blocks generate
-   **Professional Patterns**: Teach industry-standard game development practices
-   **Portfolio Ready**: Projects look and feel like professional games

## 📈 Development Status

This is an active **proof-of-concept** project targeting portfolio demonstration quality. See [TODO.md](./TODO.md) for detailed development roadmap and current status.

### ✅ Completed

-   3D editor interface with professional layout
-   Visual programming system with drag-and-drop blocks
-   Basic 3D scene management and object hierarchy
-   Transform gizmos and interactive object manipulation

### 🚧 In Progress

-   Complete visual programming block library
-   Game runtime with script execution
-   Physics integration and collision detection
-   Asset import pipeline (GLTF, textures, audio)

### 🎯 Next Milestones

-   Playable demo games showcasing engine capabilities
-   Performance optimization for smooth 60fps experience
-   Polish and user experience improvements

## 🤝 Contributing

This is primarily a portfolio project, but feedback and suggestions are welcome! If you're interested in game development education or visual programming tools, I'd love to hear your thoughts.

## 📄 License

MIT License - feel free to explore, learn from, and adapt the code for your own projects.

## 🔗 Links

-   **Live Demo**: [Coming Soon]
-   **Development Blog**: [Coming Soon]
-   **Portfolio**: [Your Portfolio URL]

---

_Bean Engine represents the intersection of education and professional game development - making the complex simple without losing the power that makes game development exciting._
