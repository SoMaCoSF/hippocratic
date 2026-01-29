#!/usr/bin/env python3
"""
Vector Search Integration for Hippocratic
Uses sentence-transformers for embeddings and Turso for storage

Features:
- Generate embeddings for facilities, financials, budgets
- Store vectors in Turso database
- Semantic search across all data
- Fraud pattern matching
"""

import sys
import os
import logging
import struct
import numpy as np
from typing import List, Dict, Any, Optional, Tuple
from pathlib import Path

# Sentence transformers for embeddings
try:
    from sentence_transformers import SentenceTransformer
    TRANSFORMERS_AVAILABLE = True
except ImportError:
    TRANSFORMERS_AVAILABLE = False
    print("⚠️  sentence-transformers not available. Install: pip install sentence-transformers")

# Database
try:
    from libsql_client import create_client
    LIBSQL_AVAILABLE = True
except ImportError:
    try:
        import sqlite3
        LIBSQL_AVAILABLE = False
        print("⚠️  libsql-client not available, using sqlite3 fallback")
    except ImportError:
        print("❌ No database client available")
        sys.exit(1)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class VectorSearch:
    """Semantic search using vector embeddings."""
    
    def __init__(
        self,
        db_path: str = "local.db",
        model_name: str = "all-MiniLM-L6-v2",
        device: str = "cpu"
    ):
        """
        Initialize vector search.
        
        Args:
            db_path: Path to SQLite/Turso database
            model_name: SentenceTransformer model name
            device: 'cpu' or 'cuda'
        """
        self.db_path = db_path
        self.model_name = model_name
        
        # Load embedding model
        if TRANSFORMERS_AVAILABLE:
            logger.info(f"Loading embedding model: {model_name}")
            self.model = SentenceTransformer(model_name, device=device)
            self.embedding_dim = self.model.get_sentence_embedding_dimension()
            logger.info(f"Embedding dimension: {self.embedding_dim}")
        else:
            self.model = None
            self.embedding_dim = 384  # Default for MiniLM
        
        # Connect to database
        if LIBSQL_AVAILABLE:
            self.db = create_client(f"file:{db_path}")
        else:
            import sqlite3
            self.db = sqlite3.connect(db_path)
    
    def encode_text(self, text: str) -> np.ndarray:
        """
        Encode text to vector embedding.
        
        Args:
            text: Input text
            
        Returns:
            Numpy array of embedding
        """
        if not self.model:
            raise RuntimeError("SentenceTransformer not available")
        
        return self.model.encode(text, convert_to_numpy=True)
    
    def vector_to_blob(self, vector: np.ndarray) -> bytes:
        """
        Convert numpy vector to binary blob for storage.
        
        Args:
            vector: Numpy array
            
        Returns:
            Binary blob
        """
        # Convert to float32 and pack as bytes
        return struct.pack(f'{len(vector)}f', *vector.astype(np.float32))
    
    def blob_to_vector(self, blob: bytes) -> np.ndarray:
        """
        Convert binary blob back to numpy vector.
        
        Args:
            blob: Binary blob
            
        Returns:
            Numpy array
        """
        # Unpack float32 bytes
        size = len(blob) // 4
        return np.array(struct.unpack(f'{size}f', blob), dtype=np.float32)
    
    def cosine_similarity(self, v1: np.ndarray, v2: np.ndarray) -> float:
        """
        Calculate cosine similarity between two vectors.
        
        Args:
            v1: First vector
            v2: Second vector
            
        Returns:
            Similarity score (0-1)
        """
        dot_product = np.dot(v1, v2)
        norm1 = np.linalg.norm(v1)
        norm2 = np.linalg.norm(v2)
        
        if norm1 == 0 or norm2 == 0:
            return 0.0
        
        return dot_product / (norm1 * norm2)
    
    def embed_facility(self, facility_id: int, text_content: str) -> int:
        """
        Generate and store embedding for a facility.
        
        Args:
            facility_id: Facility ID
            text_content: Text to embed (name, address, description, etc)
            
        Returns:
            Embedding ID
        """
        if not self.model:
            raise RuntimeError("Embedding model not available")
        
        # Generate embedding
        embedding = self.encode_text(text_content)
        blob = self.vector_to_blob(embedding)
        
        # Store in database
        if LIBSQL_AVAILABLE:
            result = self.db.execute("""
                INSERT INTO facility_embeddings (facility_id, embedding, embedding_dim, text_content, embedding_model)
                VALUES (?, ?, ?, ?, ?)
            """, [facility_id, blob, self.embedding_dim, text_content, self.model_name])
            return result.last_insert_rowid()
        else:
            cursor = self.db.cursor()
            cursor.execute("""
                INSERT INTO facility_embeddings (facility_id, embedding, embedding_dim, text_content, embedding_model)
                VALUES (?, ?, ?, ?, ?)
            """, (facility_id, blob, self.embedding_dim, text_content, self.model_name))
            self.db.commit()
            return cursor.lastrowid
    
    def search_facilities(self, query: str, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Semantic search for facilities.
        
        Args:
            query: Search query (natural language)
            limit: Maximum results
            
        Returns:
            List of matching facilities with similarity scores
        """
        if not self.model:
            raise RuntimeError("Embedding model not available")
        
        # Encode query
        query_embedding = self.encode_text(query)
        
        # Get all facility embeddings
        if LIBSQL_AVAILABLE:
            result = self.db.execute("""
                SELECT fe.id, fe.facility_id, fe.embedding, fe.text_content, f.name, f.address, f.city
                FROM facility_embeddings fe
                JOIN facilities f ON fe.facility_id = f.id
            """)
            rows = result.rows
        else:
            cursor = self.db.cursor()
            cursor.execute("""
                SELECT fe.id, fe.facility_id, fe.embedding, fe.text_content, f.name, f.address, f.city
                FROM facility_embeddings fe
                JOIN facilities f ON fe.facility_id = f.id
            """)
            rows = cursor.fetchall()
        
        # Calculate similarities
        results = []
        for row in rows:
            embedding_id, facility_id, embedding_blob, text_content, name, address, city = row
            
            # Convert blob to vector
            facility_embedding = self.blob_to_vector(embedding_blob)
            
            # Calculate similarity
            similarity = self.cosine_similarity(query_embedding, facility_embedding)
            
            results.append({
                'facility_id': facility_id,
                'name': name,
                'address': address,
                'city': city,
                'similarity': float(similarity),
                'matched_text': text_content
            })
        
        # Sort by similarity and limit
        results.sort(key=lambda x: x['similarity'], reverse=True)
        return results[:limit]
    
    def embed_all_facilities(self, batch_size: int = 100):
        """
        Generate embeddings for all facilities that don't have them.
        
        Args:
            batch_size: Process in batches
        """
        if not self.model:
            raise RuntimeError("Embedding model not available")
        
        logger.info("Generating embeddings for facilities...")
        
        # Get facilities without embeddings
        if LIBSQL_AVAILABLE:
            result = self.db.execute("""
                SELECT f.id, f.name, f.address, f.city, f.category_name, f.business_name
                FROM facilities f
                LEFT JOIN facility_embeddings fe ON f.id = fe.facility_id
                WHERE fe.id IS NULL
            """)
            facilities = result.rows
        else:
            cursor = self.db.cursor()
            cursor.execute("""
                SELECT f.id, f.name, f.address, f.city, f.category_name, f.business_name
                FROM facilities f
                LEFT JOIN facility_embeddings fe ON f.id = fe.facility_id
                WHERE fe.id IS NULL
            """)
            facilities = cursor.fetchall()
        
        logger.info(f"Found {len(facilities)} facilities without embeddings")
        
        # Process in batches
        for i in range(0, len(facilities), batch_size):
            batch = facilities[i:i+batch_size]
            
            for facility in batch:
                facility_id, name, address, city, category, business = facility
                
                # Create text representation
                text_content = f"{name} - {category or 'Healthcare Facility'} located at {address}, {city}. Owner: {business or 'Unknown'}"
                
                try:
                    self.embed_facility(facility_id, text_content)
                    logger.info(f"Embedded facility {facility_id}: {name}")
                except Exception as e:
                    logger.error(f"Error embedding facility {facility_id}: {e}")
            
            logger.info(f"Processed {min(i+batch_size, len(facilities))}/{len(facilities)} facilities")
        
        logger.info("✅ All facilities embedded")
    
    def find_similar_facilities(self, facility_id: int, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Find facilities similar to a given facility.
        
        Args:
            facility_id: Reference facility ID
            limit: Maximum results
            
        Returns:
            List of similar facilities
        """
        # Get embedding for reference facility
        if LIBSQL_AVAILABLE:
            result = self.db.execute("""
                SELECT embedding FROM facility_embeddings WHERE facility_id = ?
            """, [facility_id])
            rows = result.rows
        else:
            cursor = self.db.cursor()
            cursor.execute("""
                SELECT embedding FROM facility_embeddings WHERE facility_id = ?
            """, (facility_id,))
            rows = cursor.fetchall()
        
        if not rows:
            return []
        
        reference_embedding = self.blob_to_vector(rows[0][0])
        
        # Find similar embeddings
        if LIBSQL_AVAILABLE:
            result = self.db.execute("""
                SELECT fe.facility_id, fe.embedding, f.name, f.address, f.city
                FROM facility_embeddings fe
                JOIN facilities f ON fe.facility_id = f.id
                WHERE fe.facility_id != ?
            """, [facility_id])
            all_rows = result.rows
        else:
            cursor.execute("""
                SELECT fe.facility_id, fe.embedding, f.name, f.address, f.city
                FROM facility_embeddings fe
                JOIN facilities f ON fe.facility_id = f.id
                WHERE fe.facility_id != ?
            """, (facility_id,))
            all_rows = cursor.fetchall()
        
        # Calculate similarities
        results = []
        for row in all_rows:
            fid, embedding_blob, name, address, city = row
            facility_embedding = self.blob_to_vector(embedding_blob)
            similarity = self.cosine_similarity(reference_embedding, facility_embedding)
            
            results.append({
                'facility_id': fid,
                'name': name,
                'address': address,
                'city': city,
                'similarity': float(similarity)
            })
        
        # Sort and limit
        results.sort(key=lambda x: x['similarity'], reverse=True)
        return results[:limit]
    
    def close(self):
        """Close database connection."""
        if hasattr(self.db, 'close'):
            self.db.close()


def main():
    """CLI for vector search."""
    import argparse
    
    parser = argparse.ArgumentParser(description="Hippocratic Vector Search")
    parser.add_argument("--embed-all", action="store_true", help="Generate embeddings for all facilities")
    parser.add_argument("--search", type=str, help="Search query")
    parser.add_argument("--limit", type=int, default=10, help="Result limit")
    parser.add_argument("--db", type=str, default="local.db", help="Database path")
    
    args = parser.parse_args()
    
    vs = VectorSearch(db_path=args.db)
    
    if args.embed_all:
        vs.embed_all_facilities()
    
    if args.search:
        print(f"\n🔍 Searching for: {args.search}\n")
        results = vs.search_facilities(args.search, limit=args.limit)
        
        for i, result in enumerate(results, 1):
            print(f"{i}. {result['name']}")
            print(f"   {result['address']}, {result['city']}")
            print(f"   Similarity: {result['similarity']:.3f}")
            print()
    
    vs.close()


if __name__ == "__main__":
    main()
