import * as React from 'react';
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import { Loader } from '../components/Loader';
import api from '../lib/api';
import { Service, Category } from '../types';
import { ShoppingBag, Link, Hash, Info } from 'lucide-react';

export function NewOrder() {
  const { userProfile, refreshProfile } = useAuth();
  const { success, error } = useToast();
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  
  const [link, setLink] = useState('');
  const [quantity, setQuantity] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const [catsRes, srvsRes] = await Promise.all([
          api.get<{ categories: Category[] }>('/categories'),
          api.get<{ services: Service[] }>('/services')
        ]);
        
        setCategories(catsRes.data.categories);
        setServices(srvsRes.data.services);
        
        if (catsRes.data.categories.length > 0) {
          setSelectedCategory(catsRes.data.categories[0].name);
        }
      } catch (err) {
        console.error('Failed to load services', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const categoryServices = services.filter((s) => s.category === selectedCategory && s.status === 'active');
  const selectedService = services.find((s) => s.id === selectedServiceId) || categoryServices[0];

  useEffect(() => {
    if (categoryServices.length > 0) {
      setSelectedServiceId(categoryServices[0].id);
    } else {
      setSelectedServiceId('');
    }
  }, [selectedCategory, services]);

  const qty = Number(quantity) || 0;
  const price = selectedService ? ((qty / 1000) * selectedService.ratePerThousand) : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedServiceId || !link || !quantity) {
      error('Incomplete Fields', 'Please fill out all order parameters.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/orders', {
        serviceId: selectedServiceId,
        link,
        quantity: Number(quantity)
      });
      
      success('Order Placed', 'Your order was successfully queued on our delivery nodes.');
      setLink('');
      setQuantity('');
      await refreshProfile();
    } catch (err: any) {
      error('Order Failed', err.response?.data?.error || 'An error occurred while placing order.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Loader />;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 font-sans">
      <div className="lg:col-span-2 bg-[#0A0D15] border border-blue-900/10 rounded-2xl p-8">
        <h3 className="text-xl font-display font-bold text-white mb-6 flex items-center gap-2">
          <ShoppingBag className="w-5 h-5 text-blue-400" />
          Place Instant Social Order
        </h3>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Category selection */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Category</label>
            <select
              id="new-order-category"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-4 py-3 bg-[#06080E] border border-blue-900/15 rounded-xl text-sm text-gray-200 focus:outline-none focus:border-blue-500 transition-colors"
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.name}>{cat.name}</option>
              ))}
            </select>
          </div>

          {/* Service selection */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Service Package</label>
            <select
              id="new-order-service"
              value={selectedServiceId}
              onChange={(e) => setSelectedServiceId(e.target.value)}
              className="w-full px-4 py-3 bg-[#06080E] border border-blue-900/15 rounded-xl text-sm text-gray-200 focus:outline-none focus:border-blue-500 transition-colors"
            >
              {categoryServices.map((srv) => (
                <option key={srv.id} value={srv.id}>
                  {srv.name} - ${srv.ratePerThousand.toFixed(2)} / 1k
                </option>
              ))}
            </select>
          </div>

          {/* Link */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Target URL / Link</label>
            <div className="relative">
              <Link className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-500" />
              <input
                id="new-order-link"
                type="text"
                placeholder="https://instagram.com/p/..."
                value={link}
                onChange={(e) => setLink(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-[#06080E] border border-blue-900/15 rounded-xl text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Quantity</label>
            <div className="relative">
              <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-500" />
              <input
                id="new-order-quantity"
                type="number"
                placeholder={selectedService ? `Min: ${selectedService.minQuantity} - Max: ${selectedService.maxQuantity}` : 'Enter amount'}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-[#06080E] border border-blue-900/15 rounded-xl text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          {/* Calculations */}
          <div className="bg-[#05070B] border border-blue-900/10 rounded-xl p-5 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-gray-500 font-semibold tracking-wider uppercase mb-1">Total Charges</p>
              <h4 className="text-2xl font-mono font-bold text-blue-400">${price.toFixed(4)}</h4>
            </div>
            <button
              id="new-order-submit-btn"
              type="submit"
              disabled={submitting}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-sm font-semibold rounded-xl tracking-wide shadow-lg cursor-pointer transition-colors"
            >
              {submitting ? 'Confirming...' : 'Place Order'}
            </button>
          </div>
        </form>
      </div>

      {/* Package Description Card */}
      <div className="bg-[#0A0D15] border border-blue-900/10 rounded-2xl p-8 h-fit space-y-6">
        <h4 className="text-sm font-semibold text-gray-200 flex items-center gap-2 pb-4 border-b border-blue-900/10 uppercase tracking-wider">
          <Info className="w-4 h-4 text-blue-400" />
          Selected Package Info
        </h4>

        {selectedService ? (
          <div className="space-y-4 text-sm text-gray-400">
            <div>
              <span className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1">Name</span>
              <p className="text-gray-200 font-medium leading-relaxed">{selectedService.name}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1">Min Quantity</span>
                <p className="text-gray-200 font-mono font-medium">{selectedService.minQuantity}</p>
              </div>
              <div>
                <span className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1">Max Quantity</span>
                <p className="text-gray-200 font-mono font-medium">{selectedService.maxQuantity}</p>
              </div>
            </div>

            <div>
              <span className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1">Rate per 1,000</span>
              <p className="text-emerald-400 font-mono font-bold">${selectedService.ratePerThousand.toFixed(2)}</p>
            </div>

            <div>
              <span className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">Instructions / Specs</span>
              <div className="bg-[#05070B] border border-blue-900/5 rounded-lg p-4 font-sans text-xs whitespace-pre-line leading-relaxed">
                {selectedService.description}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-xs text-gray-600 italic">No package selected. Please choose a valid category and service.</p>
        )}
      </div>
    </div>
  );
}

export default NewOrder;
