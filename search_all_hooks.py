import os
import re

def search_hooks():
    # Find any useXXXX() calls
    pattern = re.compile(r'\b(use[A-Z]\w*)\s*\(')
    for root, dirs, files in os.walk('.'):
        if 'node_modules' in dirs:
            dirs.remove('node_modules')
        if 'dist' in dirs:
            dirs.remove('dist')
            
        for file in files:
            if file.endswith('.tsx') or file.endswith('.ts'):
                filepath = os.path.join(root, file)
                with open(filepath, 'r', encoding='utf-8') as f:
                    try:
                        content = f.read()
                        lines = content.split('\n')
                        for idx, line in enumerate(lines):
                            if 'use' in line:
                                matches = pattern.findall(line)
                                for m in matches:
                                    # Print the file, line number, and the line
                                    print(f"{filepath}:{idx+1}: {m} inside: {line.strip()}")
                    except Exception as e:
                        pass

if __name__ == '__main__':
    search_hooks()
