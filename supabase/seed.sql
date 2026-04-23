-- Insert a default project for local dev
insert into projects (name, slug, figma_file_key)
values ('Systemix Dev', 'systemix-dev', 'h1m7dfFILe1wGSfxwQ6U02')
on conflict (slug) do nothing;
