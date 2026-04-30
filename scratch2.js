const url = 'https://negnyzndjixvkntpsisv.supabase.co/rest/v1/teachers?select=subject';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5lZ255em5kaml4dmtudHBzaXN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4NDE0NzEsImV4cCI6MjA4NjQxNzQ3MX0.i5bgiSvL735z1fj4GNDYldwMLD6YPJx4ESz9HGwZrlE';

fetch(url, {
  headers: {
    'apikey': key,
    'Authorization': 'Bearer ' + key,
  }
}).then(res => res.json()).then(data => {
  if (data.error) {
    console.error(data.error);
  } else {
    const distinct = new Set(data.map(d => d.subject?.trim()));
    console.log(Array.from(distinct).filter(Boolean));
  }
}).catch(console.error);
