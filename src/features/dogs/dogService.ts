import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

type Dog = Database['public']['Tables']['dogs']['Row'];
type DogInsert = Database['public']['Tables']['dogs']['Insert'];
type DogUpdate = Database['public']['Tables']['dogs']['Update'];

export async function getDogs(sitterId: string): Promise<Dog[]> {
  const { data, error } = await supabase
    .from('dogs')
    .select('*')
    .eq('sitter_id', sitterId)
    .order('name');

  if (error) throw error;
  return data;
}

export async function getDog(id: string): Promise<Dog> {
  const { data, error } = await supabase
    .from('dogs')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

export async function createDog(dog: DogInsert): Promise<Dog> {
  const { data, error } = await supabase
    .from('dogs')
    .insert(dog)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateDog(id: string, updates: DogUpdate): Promise<Dog> {
  const { data, error } = await supabase
    .from('dogs')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteDog(id: string): Promise<void> {
  const { error } = await supabase.from('dogs').delete().eq('id', id);
  if (error) throw error;
}

export async function uploadDogPhoto(dogId: string, file: File): Promise<string> {
  const { error } = await supabase.storage
    .from('dog-photos')
    .upload(`${dogId}/${file.name}`, file, { upsert: true });

  if (error) throw error;

  const { data } = supabase.storage
    .from('dog-photos')
    .getPublicUrl(`${dogId}/${file.name}`);

  return data.publicUrl;
}
