// Test file for GameObject transform system
import { GameObject, RotationUtils } from './GameObject';
import * as Types from '$lib/types';
import * as THREE from 'three';

// Helper function to create a test BNode3D
function createTestBNode(name: string, position = { x: 0, y: 0, z: 0 }, rotation = { x: 0, y: 0, z: 0 }): Types.BNode3D {
    const bNode = new Types.BNode3D();
    bNode.id = `test-${name}`;
    (bNode as any).name = name;
    bNode.position = new Types.BVector3(position.x, position.y, position.z);
    bNode.rotation = new Types.BVector3(rotation.x, rotation.y, rotation.z);
    bNode.scale = new Types.BVector3(1, 1, 1);
    return bNode;
}

// Test cases for the new transform system
export function runGameObjectTransformTests() {
    console.log('=== GameObject Transform System Tests ===');
    
    // Test 1: Basic transform initialization
    console.log('\nTest 1: Basic transform initialization');
    try {
        const bNode = createTestBNode('test-object', { x: 5, y: 10, z: 15 });
        const gameObject = new GameObject(bNode);
        
        const transform = gameObject.transform;
        console.log('Position:', transform.position.x, transform.position.y, transform.position.z);
        console.log('Expected: 5, 10, 15');
        
        if (transform.position.x === 5 && transform.position.y === 10 && transform.position.z === 15) {
            console.log('✅ Transform initialization test passed');
        } else {
            console.log('❌ Transform initialization test failed');
        }
    } catch (error) {
        console.log('💥 Exception in Test 1:', error);
    }
    
    // Test 2: Parent-child hierarchy with offsets
    console.log('\nTest 2: Parent-child hierarchy with offsets');
    try {
        const parentBNode = createTestBNode('parent', { x: 10, y: 0, z: 0 });
        const childBNode = createTestBNode('child', { x: 15, y: 5, z: 0 });
        
        const parent = new GameObject(parentBNode);
        const child = new GameObject(childBNode);
        
        // Establish parent-child relationship
        parent.addChild(child);
        
        console.log('Before updateWorldMatrix:');
        console.log('Parent position:', parent.transform.position.x, parent.transform.position.y, parent.transform.position.z);
        console.log('Child position:', child.transform.position.x, child.transform.position.y, child.transform.position.z);
        
        // Update world matrices to apply offset calculation
        parent.updateWorldMatrix();
        
        console.log('After updateWorldMatrix:');
        console.log('Parent position:', parent.transform.position.x, parent.transform.position.y, parent.transform.position.z);
        console.log('Child position:', child.transform.position.x, child.transform.position.y, child.transform.position.z);
        
        // Check if offset was calculated correctly
        // When parent moves, child should maintain relative offset
        parent.transform.position.set(20, 0, 0);
        parent.updateWorldMatrix();
        
        console.log('After moving parent to (20, 0, 0):');
        console.log('Child position:', child.transform.position.x, child.transform.position.y, child.transform.position.z);
        console.log('Expected child to move with offset');
        
        console.log('✅ Parent-child hierarchy test completed');
    } catch (error) {
        console.log('💥 Exception in Test 2:', error);
    }
    
    // Test 3: Rotation offsets
    console.log('\nTest 3: Rotation offsets');
    try {
        const parentBNode = createTestBNode('parent-rot', { x: 0, y: 0, z: 0 }, { x: 0, y: Math.PI / 2, z: 0 });
        const childBNode = createTestBNode('child-rot', { x: 5, y: 0, z: 0 }, { x: 0, y: 0, z: 0 });
        
        const parent = new GameObject(parentBNode);
        const child = new GameObject(childBNode);
        
        parent.addChild(child);
        parent.updateWorldMatrix();
        
        console.log('Parent rotation (Y):', parent.transform.rotation.y);
        console.log('Child position after parent rotation:', child.transform.position.x, child.transform.position.y, child.transform.position.z);
        console.log('Expected: child should be rotated with parent');
        
        console.log('✅ Rotation offset test completed');
    } catch (error) {
        console.log('💥 Exception in Test 3:', error);
    }
    
    // Test 4: Physics-driven objects
    console.log('\nTest 4: Physics-driven objects');
    try {
        const parentBNode = createTestBNode('physics-parent', { x: 0, y: 0, z: 0 });
        const childBNode = createTestBNode('physics-child', { x: 5, y: 0, z: 0 });
        
        const parent = new GameObject(parentBNode);
        const child = new GameObject(childBNode);
        
        // Set child as physics-driven
        child.isPhysicsDriven = true;
        
        parent.addChild(child);
        
        // Move child independently (simulating physics)
        child.transform.position.set(100, 50, 25);
        
        parent.updateWorldMatrix();
        
        console.log('Physics-driven child position:', child.transform.position.x, child.transform.position.y, child.transform.position.z);
        console.log('Expected: 100, 50, 25 (should not be affected by parent)');
        
        if (child.transform.position.x === 100 && child.transform.position.y === 50 && child.transform.position.z === 25) {
            console.log('✅ Physics-driven object test passed');
        } else {
            console.log('❌ Physics-driven object test failed');
        }
    } catch (error) {
        console.log('💥 Exception in Test 4:', error);
    }
    
    console.log('\n=== Transform Tests Complete ===');
}

// Export for use in browser console
if (typeof window !== 'undefined') {
    (window as any).runGameObjectTransformTests = runGameObjectTransformTests;
    console.log('GameObject transform tests available. Run: runGameObjectTransformTests()');
}