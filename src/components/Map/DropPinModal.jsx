import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export function DropPinModal({ location, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    type: 'open_camp',
    title: '',
    description: '',
    tags: [],
    activeUntil: null
  });

  async function handleSubmit(e) {
    e.preventDefault();
    
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        console.error('User not logged in');
        return;
    }

    const { data, error } = await supabase
      .from('locations')
      .insert({
        location: `POINT(${location.lng} ${location.lat})`,
        type: formData.type,
        title: formData.title,
        description: formData.description,
        active_until: formData.activeUntil,
        created_by: user.id
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating pin:', error);
      return;
    }

    // Add tags
    if (formData.tags.length > 0) {
      await supabase
        .from('pin_tags')
        .insert(
          formData.tags.map(tag => ({
            location_id: data.id,
            tag
          }))
        );
    }

    onSuccess(data);
    onClose();
  }

  return (
    <div className="modal"> 
      <form onSubmit={handleSubmit}>
        <h2>Drop a Pin</h2>
        
        <label>
          Type:
          <select 
            value={formData.type}
            onChange={(e) => setFormData({...formData, type: e.target.value})}
          >
            <option value="open_camp">Open Camp</option>
            <option value="gathering">Gathering</option>
            <option value="quiet_place">Quiet Place</option>
          </select>
        </label>

        <label>
          Title:
          <input 
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({...formData, title: e.target.value})}
            placeholder="e.g., Sunset Worship Circle"
            required
          />
        </label>

        <label>
          Description:
          <textarea 
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
            placeholder="Tell others what to expect..."
          />
        </label>

        <label>
          Tags:
          <div className="tag-selector">
            {['worship_tonight', 'bring_food', 'guitar_circle', 'intercession', 
              'sunrise_prayer', 'communion', 'bible_study'].map(tag => (
              <label key={tag}>
                <input
                  type="checkbox"
                  checked={formData.tags.includes(tag)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setFormData({...formData, tags: [...formData.tags, tag]});
                    } else {
                      setFormData({...formData, tags: formData.tags.filter(t => t !== tag)});
                    }
                  }}
                />
                {tag.replace('_', ' ')}
              </label>
            ))}
          </div>
        </label>

        <label>
          Active Until (optional):
          <input 
            type="datetime-local"
            value={formData.activeUntil}
            onChange={(e) => setFormData({...formData, activeUntil: e.target.value})}
          />
        </label>

        <div className="button-group">
          <button type="button" onClick={onClose}>Cancel</button>
          <button type="submit">Drop Pin</button>
        </div>
      </form>
    </div>
  );
}
