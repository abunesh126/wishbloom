alter table public.surprises
  add column if not exists experience jsonb not null default
    '{"enabled":{"song":false,"wishes":true,"candles":true,"memory":false},"pageOrder":["welcome","song","wishes","candles","memory","final"],"songTitle":"","songDedication":"","songPath":"","memoryTitle":"","memories":[]}'::jsonb;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'surprise-assets',
  'surprise-assets',
  false,
  12582912,
  array['audio/mpeg','audio/mp4','audio/wav','audio/x-wav','audio/ogg','audio/webm','image/jpeg','image/png','image/webp']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Surprise asset owners and published guests can read" on storage.objects;
create policy "Surprise asset owners and published guests can read"
on storage.objects for select to anon, authenticated
using (
  bucket_id = 'surprise-assets'
  and (
    exists (
      select 1
      from public.surprises s
      where s.id::text = (storage.foldername(name))[2]
        and s.owner_id = auth.uid()
        and (storage.foldername(name))[1] = auth.uid()::text
    )
    or exists (
      select 1
      from public.surprises s
      where s.id::text = (storage.foldername(name))[2]
        and s.published = true
        and (
          (
            s.experience #>> '{enabled,song}' = 'true'
            and s.experience ->> 'songPath' = name
          )
          or (
            s.experience #>> '{enabled,memory}' = 'true'
            and exists (
              select 1
              from jsonb_array_elements(
                case
                  when jsonb_typeof(s.experience -> 'memories') = 'array'
                    then s.experience -> 'memories'
                  else '[]'::jsonb
                end
              ) as memory(item)
              where memory.item ->> 'path' = name
            )
          )
        )
    )
  )
);

drop policy if exists "Surprise owners can upload assets" on storage.objects;
create policy "Surprise owners can upload assets"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'surprise-assets'
  and (storage.foldername(name))[1] = auth.uid()::text
  and exists (
    select 1
    from public.surprises s
    where s.id::text = (storage.foldername(name))[2]
      and s.owner_id = auth.uid()
  )
);

drop policy if exists "Surprise owners can update assets" on storage.objects;
create policy "Surprise owners can update assets"
on storage.objects for update to authenticated
using (
  bucket_id = 'surprise-assets'
  and (storage.foldername(name))[1] = auth.uid()::text
  and exists (
    select 1
    from public.surprises s
    where s.id::text = (storage.foldername(name))[2]
      and s.owner_id = auth.uid()
  )
)
with check (
  bucket_id = 'surprise-assets'
  and (storage.foldername(name))[1] = auth.uid()::text
  and exists (
    select 1
    from public.surprises s
    where s.id::text = (storage.foldername(name))[2]
      and s.owner_id = auth.uid()
  )
);

drop policy if exists "Surprise owners can delete assets" on storage.objects;
create policy "Surprise owners can delete assets"
on storage.objects for delete to authenticated
using (
  bucket_id = 'surprise-assets'
  and (storage.foldername(name))[1] = auth.uid()::text
  and exists (
    select 1
    from public.surprises s
    where s.id::text = (storage.foldername(name))[2]
      and s.owner_id = auth.uid()
  )
);
