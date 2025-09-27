#!/usr/bin/env node

// Simple test script to verify API integration
const http = require('http');

const API_BASE_URL = 'http://localhost:8000';

async function testAPI() {
  console.log('🧪 Testing API Integration...\n');
  
  // Test 1: Check if mock server is running
  console.log('1. Testing mock server availability...');
  try {
    const response = await fetch(`${API_BASE_URL}/admin/academic-persons`);
    const data = await response.json();
    console.log('✅ Mock server is running');
    console.log(`   Found ${data.data.length} academic persons`);
  } catch (error) {
    console.log('❌ Mock server is not accessible:', error.message);
    return;
  }
  
  // Test 2: Test universities endpoint
  console.log('\n2. Testing universities endpoint...');
  try {
    const response = await fetch(`${API_BASE_URL}/admin/universities`);
    const data = await response.json();
    console.log('✅ Universities endpoint working');
    console.log(`   Found ${data.data.length} universities`);
  } catch (error) {
    console.log('❌ Universities endpoint failed:', error.message);
  }
  
  // Test 3: Test faculties endpoint
  console.log('\n3. Testing faculties endpoint...');
  try {
    const response = await fetch(`${API_BASE_URL}/admin/faculties`);
    const data = await response.json();
    console.log('✅ Faculties endpoint working');
    console.log(`   Found ${data.data.length} faculties`);
  } catch (error) {
    console.log('❌ Faculties endpoint failed:', error.message);
  }
  
  // Test 4: Test login endpoint
  console.log('\n4. Testing login endpoint...');
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@test.com',
        password: 'password123'
      })
    });
    const data = await response.json();
    console.log('✅ Login endpoint working');
    console.log(`   Login successful: ${data.success}`);
  } catch (error) {
    console.log('❌ Login endpoint failed:', error.message);
  }
  
  console.log('\n🎉 API Integration Test Complete!');
  console.log('\nTo test the UI:');
  console.log('1. Make sure both servers are running:');
  console.log('   - Mock server: python3 mock_server.py');
  console.log('   - UI server: cd UI && npm run dev');
  console.log('2. Open http://localhost:5173 in your browser');
  console.log('3. Navigate to admin section and test thesis creation/editing');
}

// Use fetch if available (Node 18+), otherwise use http module
if (typeof fetch === 'undefined') {
  global.fetch = require('node-fetch');
}

testAPI().catch(console.error);