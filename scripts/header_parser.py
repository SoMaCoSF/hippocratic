# ==============================================================================
# file_id: SOM-SCR-0008-v0.1.0
# name: header_parser.py
# description: Parse SOM-XXX file headers from project files
# project_id: CCPC
# category: script
# tags: [headers, parsing, metadata, catalog]
# created: 2025-01-14
# modified: 2025-01-14
# version: 0.1.0
# agent_id: AGENT-OPUS-001
# execution: from ccpc.header_parser import HeaderParser
# ==============================================================================

"""Header parser for Ghost Catalog / SOM-XXX file headers."""

import re
from pathlib import Path
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field
import logging

logger = logging.getLogger(__name__)


@dataclass
class HeaderInfo:
    """Parsed header information."""
    file_id: str = ''
    name: str = ''
    description: str = ''
    project_id: str = ''
    category: str = ''
    tags: List[str] = field(default_factory=list)
    created: str = ''
    modified: str = ''
    version: str = ''
    agent_id: str = ''
    execution: str = ''
    raw_lines: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            'file_id': self.file_id,
            'name': self.name,
            'description': self.description,
            'project_id': self.project_id,
            'category': self.category,
            'tags': self.tags,
            'created': self.created,
            'modified': self.modified,
            'version': self.version,
            'agent_id': self.agent_id,
            'execution': self.execution,
        }


class HeaderParser:
    """Parse SOM-XXX file headers from various file types."""

    # File extensions and their comment styles
    COMMENT_STYLES = {
        '.py': 'hash',
        '.ps1': 'ps1',
        '.sh': 'hash',
        '.yaml': 'hash',
        '.yml': 'hash',
        '.toml': 'hash',
        '.md': 'html',
        '.html': 'html',
        '.js': 'js',
        '.ts': 'js',
        '.jsx': 'js',
        '.tsx': 'js',
        '.css': 'css',
        '.scss': 'css',
        '.sql': 'sql',
    }

    # Category codes from the SOM system
    CATEGORY_CODES = {
        'CMD': 'Slash commands',
        'SCR': 'Scripts',
        'DOC': 'Documentation',
        'CFG': 'Configuration',
        'REG': 'Registry files',
        'TST': 'Tests',
        'TMP': 'Templates',
        'DTA': 'Data/schemas',
        'LOG': 'Logs/diaries',
        'CMP': 'Components',
        'STY': 'Styles',
        'API': 'API Endpoints',
        'MDL': 'Models',
        'VIE': 'Views',
        'INF': 'Infrastructure',
        'INT': 'Integrations',
        'MIG': 'Migrations',
    }

    def has_header(self, content: str, is_json: bool = False) -> bool:
        """Check if content has a Ghost Catalog header."""
        first_1500 = content[:1500].lower()

        # JSON files use _metadata element
        if is_json or '"_metadata"' in first_1500:
            return '"_metadata"' in first_1500 and '"file_id"' in first_1500

        return 'file_id:' in first_1500 and (
            'som-' in first_1500 or
            ('name:' in first_1500 and 'description:' in first_1500)
        )

    def parse_header(self, content: str) -> Optional[HeaderInfo]:
        """Parse header from file content."""
        if not self.has_header(content):
            return None

        header = HeaderInfo()
        lines = content.split('\n')[:60]
        header.raw_lines = lines[:40]

        for line in lines:
            # Clean line from comment markers
            clean = line.strip()
            for prefix in ['#', '//', '*', '--', '<!--', '-->', '<#', '#>', '"""', "'''"]:
                clean = clean.replace(prefix, '').strip()

            if ':' in clean and '=' not in clean and '://' not in clean:
                parts = clean.split(':', 1)
                if len(parts) == 2:
                    key = parts[0].strip().lower().replace(' ', '_').replace('-', '_')
                    value = parts[1].strip()

                    if key == 'file_id':
                        header.file_id = value
                    elif key == 'name':
                        header.name = value
                    elif key == 'description':
                        header.description = value
                    elif key == 'project_id':
                        header.project_id = value
                    elif key == 'category':
                        header.category = value
                    elif key == 'tags':
                        # Parse tags array
                        tags_match = re.search(r'\[(.+?)\]', value)
                        if tags_match:
                            header.tags = [t.strip().strip('"\'') for t in tags_match.group(1).split(',')]
                    elif key == 'created':
                        header.created = value
                    elif key == 'modified':
                        header.modified = value
                    elif key == 'version':
                        header.version = value
                    elif key in ('agent_id', 'id'):
                        if not header.agent_id:
                            header.agent_id = value
                    elif key in ('execution', 'invocation'):
                        if not header.execution:
                            header.execution = value

        return header if header.file_id else None

    def parse_file(self, file_path: Path) -> Optional[HeaderInfo]:
        """Parse header from a file."""
        try:
            content = file_path.read_text(encoding='utf-8', errors='ignore')
            return self.parse_header(content)
        except Exception as e:
            logger.warning(f"Could not parse header from {file_path}: {e}")
            return None

    def parse_file_id(self, file_id: str) -> Dict[str, str]:
        """Parse a file_id string into components.

        Format: SOM-{CATEGORY}-{SEQUENCE}-v{VERSION}
        Example: SOM-SCR-0010-v1.0.0
        """
        result = {
            'full': file_id,
            'prefix': '',
            'category': '',
            'sequence': '',
            'version': '',
        }

        # Pattern: SOM-XXX-NNNN-vX.X.X
        match = re.match(r'(SOM)-([A-Z]{3})-(\d{4})-v([\d.]+)', file_id)
        if match:
            result['prefix'] = match.group(1)
            result['category'] = match.group(2)
            result['sequence'] = match.group(3)
            result['version'] = match.group(4)

        return result

    def get_category_description(self, code: str) -> str:
        """Get description for a category code."""
        return self.CATEGORY_CODES.get(code.upper(), 'Unknown')

    def scan_project_headers(self, project_path: Path, max_files: int = 100) -> Dict[str, Any]:
        """Scan a project for files with headers.

        Returns summary statistics and list of files with headers.
        """
        result = {
            'project_path': str(project_path),
            'total_scanned': 0,
            'with_headers': 0,
            'without_headers': 0,
            'by_category': {},
            'files': [],
        }

        # Extensions to scan
        extensions = set(self.COMMENT_STYLES.keys())

        count = 0
        for file_path in project_path.rglob('*'):
            if count >= max_files:
                break

            if not file_path.is_file():
                continue

            # Skip common non-source directories
            path_str = str(file_path).lower()
            if any(skip in path_str for skip in [
                'node_modules', '.venv', 'venv', '__pycache__',
                '.git', 'site-packages', '.next', 'dist', 'build'
            ]):
                continue

            ext = file_path.suffix.lower()
            if ext not in extensions:
                continue

            result['total_scanned'] += 1
            count += 1

            header = self.parse_file(file_path)
            if header:
                result['with_headers'] += 1

                # Track by category
                cat = header.category.upper() if header.category else 'UNK'
                if cat not in result['by_category']:
                    result['by_category'][cat] = 0
                result['by_category'][cat] += 1

                result['files'].append({
                    'path': str(file_path.relative_to(project_path)),
                    'file_id': header.file_id,
                    'category': header.category,
                    'description': header.description,
                    'version': header.version,
                    'modified': header.modified,
                })
            else:
                result['without_headers'] += 1

        return result


def main():
    """Test the header parser."""
    import sys

    if len(sys.argv) < 2:
        print("Usage: python header_parser.py <file_or_directory>")
        return

    path = Path(sys.argv[1])
    parser = HeaderParser()

    if path.is_file():
        header = parser.parse_file(path)
        if header:
            print(f"Header found in {path.name}:")
            for key, value in header.to_dict().items():
                print(f"  {key}: {value}")
        else:
            print(f"No header found in {path.name}")
    elif path.is_dir():
        result = parser.scan_project_headers(path)
        print(f"\nProject: {result['project_path']}")
        print(f"Scanned: {result['total_scanned']}")
        print(f"With headers: {result['with_headers']}")
        print(f"Without headers: {result['without_headers']}")
        print(f"\nBy category:")
        for cat, count in sorted(result['by_category'].items()):
            desc = parser.get_category_description(cat)
            print(f"  {cat} ({desc}): {count}")


if __name__ == '__main__':
    main()
