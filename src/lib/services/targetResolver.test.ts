// Test file for target resolver functionality
import { resolveTarget, resolveTargetGameObject, getTargetResolutionError } from './targetResolver';
import { sceneStore } from '$lib/sceneStore';
import { runtimeStore } from '$lib/runtimeStore';
import * as Types from '$lib/types';

// Mock runtime context for testing
const createMockContext = (gameObject?: any) => ({
    gameObject,
    evaluateChip: async (chip: any) => chip,
    variables: new Map(),
    scene: null,
    variablesMap: {}
});

// Test cases for target resolution
const testCases = [
    // Path navigation tests
    { input: '.', description: 'Current object (self)' },
    { input: '..', description: 'Parent object' },
    { input: './child1', description: 'Direct child by name' },
    { input: '../sibling', description: 'Sibling through parent' },
    { input: './child1/grandchild', description: 'Nested child navigation' },
    
    // Query tests
    { input: '#object123', description: 'Object by ID' },
    { input: '@MyObject', description: 'Object by name' },
    { input: '$BPart', description: 'First object by type' },
    
    // Edge cases
    { input: '', description: 'Empty string (should default to current)' },
    { input: '#nonexistent', description: 'Non-existent ID' },
    { input: '@NonExistent', description: 'Non-existent name' },
    { input: '$NonExistentType', description: 'Non-existent type' },
    { input: './nonexistent', description: 'Non-existent child' },
    { input: '../../../root', description: 'Deep parent navigation' },
];

// Function to run tests (for manual testing in console)
export function runTargetResolverTests() {
    console.log('=== Target Resolver Tests ===');
    
    // Create some test objects in scene
    const scene = sceneStore.getScene();
    console.log('Current scene objects:', scene.objects.length);
    
    // Test each case
    testCases.forEach((testCase, index) => {
        console.log(`\nTest ${index + 1}: ${testCase.description}`);
        console.log(`Input: "${testCase.input}"`);
        
        try {
            const mockContext = createMockContext();
            const result = resolveTarget(testCase.input, mockContext, false);
            
            if (result.success) {
                console.log('✅ Success:', result.target?.name || result.target?.id || 'Unknown');
            } else {
                console.log('❌ Failed:', result.error);
            }
        } catch (error) {
            console.log('💥 Exception:', error);
        }
    });
    
    console.log('\n=== GameObject Resolution Tests ===');
    
    // Test GameObject resolution if GameObjectManager is available
    const gameObjectManager = runtimeStore.getGameObjectManager();
    if (gameObjectManager) {
        console.log('GameObjectManager available, testing GameObject resolution...');
        
        testCases.slice(0, 5).forEach((testCase, index) => {
            console.log(`\nGameObject Test ${index + 1}: ${testCase.description}`);
            
            try {
                const mockContext = createMockContext();
                const gameObject = resolveTargetGameObject(testCase.input, mockContext);
                
                if (gameObject) {
                    console.log('✅ GameObject found:', gameObject.name || gameObject.id);
                } else {
                    const error = getTargetResolutionError(testCase.input, mockContext);
                    console.log('❌ GameObject not found:', error);
                }
            } catch (error) {
                console.log('💥 Exception:', error);
            }
        });
    } else {
        console.log('GameObjectManager not available, skipping GameObject tests');
    }
    
    console.log('\n=== Tests Complete ===');
}

// Export for use in browser console
if (typeof window !== 'undefined') {
    (window as any).runTargetResolverTests = runTargetResolverTests;
    console.log('Target resolver tests available. Run: runTargetResolverTests()');
}