---
id: ai-kb-index-sync-pseudocode
type: meta
tags:
  - ai-kb
  - index-sync
updated_at: 2025-11-27
---

### AI KB → Vector DB index sync – pseudocode

This describes how to keep the vector DB in sync with the AI KB docs under `docs/ai-kb/`, using `docs/ai-kb/index.jsonl` as the catalog.

Assumptions:

- Each line in `index.jsonl` is a JSON object:
  - `{ "id": "...", "path": "docs/ai-kb/...md", "type": "...", "tags": [...], "updated_at": "YYYY-MM-DD" }`
- Vector DB stores:
  - `id` – primary key
  - `embedding`
  - `metadata` including at least `updated_at`

```pseudo
function sync_ai_kb_to_vector_db():
    # 1. Load current catalog from index.jsonl
    catalog_entries = []
    for line in read_lines("docs/ai-kb/index.jsonl"):
        if line is empty:
            continue
        entry = parse_json(line)
        catalog_entries.append(entry)

    # Build quick lookup of catalog ids
    local_ids = set(entry.id for entry in catalog_entries)

    # 2. Upsert / re-index docs whose content changed
    for entry in catalog_entries:
        doc_id      = entry.id
        doc_path    = entry.path          # relative path within repo
        doc_type    = entry.type
        doc_tags    = entry.tags or []
        doc_updated = parse_date(entry.updated_at)

        # Fetch existing metadata from vector DB (if any)
        existing_meta = vector_db.get_metadata(doc_id)   # returns null if not present

        should_reindex = false

        if existing_meta is null:
            should_reindex = true
        else:
            existing_updated = parse_date(existing_meta.updated_at)
            if doc_updated > existing_updated:
                should_reindex = true

        if not should_reindex:
            continue

        # Read file content
        content = read_file(doc_path)

        # Optionally: extract frontmatter and body separately
        frontmatter, body = split_frontmatter(content)

        # Prepare text for embedding (usually body, maybe some frontmatter fields)
        text_for_embedding = body

        # Compute embedding
        embedding = embed(text_for_embedding)

        # Build metadata payload for vector DB
        metadata = {
            "id": doc_id,
            "path": doc_path,
            "type": doc_type,
            "tags": doc_tags,
            "updated_at": entry.updated_at
            # optionally: add parsed frontmatter fields here
        }

        # Upsert into vector DB
        vector_db.upsert(
            id        = doc_id,
            embedding = embedding,
            metadata  = metadata
        )

    # 3. Delete docs that were removed locally
    # Get all ids currently in vector DB for this project/namespace
    remote_ids = vector_db.list_ids()

    for remote_id in remote_ids:
        if remote_id not in local_ids:
            vector_db.delete(remote_id)

    # 4. Done – vector DB is now synced to the current contents of docs/ai-kb/
```

Notes:

- If you prefer, you can also compute a hash of the file contents and store it in metadata to decide `should_reindex` instead of, or in addition to, `updated_at`.
- If you run multiple projects in the same vector DB, scope `list_ids()` and queries by a `namespace` or `project` metadata field.


