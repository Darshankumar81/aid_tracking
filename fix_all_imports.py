import os, re

base_dir = "backend"

# Regex replacements for all common wrong imports
replacements = {
    r"\bfrom\s+database": "from backend.database",
    r"\bfrom\s+models": "from backend.models",
    r"\bfrom\s+schemas": "from backend.schemas",
    r"\bfrom\s+settings": "from backend.settings",
    r"\bfrom\s+deps": "from backend.deps",
    r"\bfrom\s+utils": "from backend.utils",
    r"\bimport\s+models,\s*schemas": "from backend import models, schemas",
    r"\bimport\s+backend\.models\s+as\s+models,\s*schemas": "from backend import models, schemas",
    r"\bimport\s+backend\.models\s+as\s+models": "import backend.models as models",
    r"\bimport\s+backend\.schemas\s+as\s+schemas": "import backend.schemas as schemas",
    r"\bimport\s+models": "import backend.models as models",
    r"\bimport\s+schemas": "import backend.schemas as schemas",
}

for root, _, files in os.walk(base_dir):
    for file in files:
        if file.endswith(".py"):
            path = os.path.join(root, file)
            with open(path, "r", encoding="utf-8") as f:
                content = f.read()

            new_content = content
            for old, new in replacements.items():
                new_content = re.sub(old, new, new_content)

            if new_content != content:
                with open(path, "w", encoding="utf-8") as f:
                    f.write(new_content)
                print(f"✅ Fixed imports in: {path}")

print("\n🎉 All imports cleaned successfully!")
