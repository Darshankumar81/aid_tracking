// src/components/DispatchForm.js
import React, { useState } from 'react';
import { createTransaction } from '../api';

const DispatchForm = ({ onShipmentAdded }) => {
  const [formData, setFormData] = useState({
    aid_type: 'medical',
    product_name: '',
    amount: '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createTransaction({
        aid_type: formData.aid_type,
        product_name: formData.product_name,
        amount: Number(formData.amount),
        status: 'in_transit',
      });
      setFormData({ aid_type: 'medical', product_name: '', amount: '' });
      if (onShipmentAdded) onShipmentAdded();
    } catch (err) {
      alert('Failed to create shipment.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background: '#f8f9fa', padding: '16px', borderRadius: '8px', border: '1px solid #ddd' }}>
      <h3 style={{ marginTop: 0 }}>Dispatch New Aid Shipment</h3>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '10px' }}>
          <label style={{ display: 'block', fontSize: '12px' }}>Aid Type</label>
          <select 
            value={formData.aid_type} 
            onChange={(e) => setFormData({ ...formData, aid_type: e.target.value })}
            style={{ width: '100%', padding: '8px', marginTop: '4px' }}
          >
            <option value="medical">Medical Supplies</option>
            <option value="food">Food & Water</option>
            <option value="shelter">Shelter & Clothing</option>
          </select>
        </div>

        <div style={{ marginBottom: '10px' }}>
          <label style={{ display: 'block', fontSize: '12px' }}>Product Name</label>
          <input 
            type="text" 
            value={formData.product_name} 
            onChange={(e) => setFormData({ ...formData, product_name: e.target.value })} 
            placeholder="e.g. Bandages"
            required 
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', fontSize: '12px' }}>Quantity / Units</label>
          <input 
            type="number" 
            value={formData.amount} 
            onChange={(e) => setFormData({ ...formData, amount: e.target.value })} 
            placeholder="e.g. 250"
            required 
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
          />
        </div>

        <button type="submit" disabled={loading} style={{ width: '100%', padding: '10px', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          {loading ? 'Submitting...' : 'Dispatch Shipment'}
        </button>
      </form>
    </div>
  );
};

export default DispatchForm;