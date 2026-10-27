# CLAUDE.md

## Git kuralları

- Tüm commit'ler şu kimlikle atılmalıdır:
  - `git config user.name "Ertugrul Celik"`
  - `git config user.email "ertugrulcelikgpt@gmail.com"`
  - Commit atmadan önce kimliği kontrol et; farklıysa yukarıdaki komutlarla düzelt.
- Commit mesajlarına `Co-Authored-By: Claude ...` satırı, `Claude-Session:` linki veya başka herhangi bir Claude/Anthropic atıf satırı **ekleme**.
- PR açıklamalarına "Generated with Claude Code" veya benzeri atıf satırı **ekleme**.
- Amaç: GitHub Contributors listesinde yalnızca repo sahibi görünmeli.
