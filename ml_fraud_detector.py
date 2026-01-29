"""
ML-Powered Fraud Detection System
Uses PyOD, XGBoost, LightGBM for advanced anomaly detection and classification
"""

import sys
sys.stdout.reconfigure(encoding='utf-8')

import sqlite3
import pandas as pd
import numpy as np
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime
import json
import warnings
warnings.filterwarnings('ignore')

# PyOD - 30+ anomaly detection algorithms
from pyod.models.iforest import IForest
from pyod.models.lof import LOF
from pyod.models.cblof import CBLOF
from pyod.models.knn import KNN
from pyod.models.hbos import HBOS
from pyod.models.ecod import ECOD
from pyod.models.copod import COPOD

# XGBoost and LightGBM
import xgboost as xgb
import lightgbm as lgb

# Scikit-learn
from sklearn.preprocessing import StandardScaler, RobustScaler
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, confusion_matrix, roc_auc_score, precision_recall_curve

# Imbalanced learning
from imblearn.over_sampling import SMOTE
from imblearn.under_sampling import RandomUnderSampler
from imblearn.combine import SMOTETomek


class MLFraudDetector:
    """Advanced ML-based fraud detection using PyOD and gradient boosting."""
    
    def __init__(self, db_path: str = "local.db"):
        self.db_path = db_path
        self.conn = sqlite3.connect(db_path)
        self.models = {}
        self.scalers = {}
        self.results = {}
    
    def __del__(self):
        if hasattr(self, 'conn'):
            self.conn.close()
    
    def prepare_features(self, include_derived: bool = True) -> Tuple[pd.DataFrame, np.ndarray]:
        """Prepare feature matrix for ML models."""
        
        # Load merged data
        query = """
            SELECT 
                f.id as facility_id,
                f.name,
                f.license_number,
                f.category_name,
                f.county,
                f.capacity,
                f.lat,
                f.lng,
                fin.year,
                fin.total_revenue,
                fin.total_expenses,
                fin.net_income,
                fin.total_visits,
                fin.total_patients,
                fin.revenue_per_visit
            FROM facilities f
            JOIN financials fin ON f.license_number = fin.license_number
            WHERE fin.total_revenue IS NOT NULL
            AND fin.total_revenue > 0
        """
        
        df = pd.read_sql_query(query, self.conn)
        
        if len(df) == 0:
            raise ValueError("No data available for ML analysis")
        
        # Derived features
        if include_derived:
            # Profit margin
            df['profit_margin'] = df['net_income'] / df['total_revenue'].replace(0, np.nan)
            
            # Revenue per patient
            df['revenue_per_patient'] = df['total_revenue'] / df['total_patients'].replace(0, np.nan)
            
            # Visits per patient
            df['visits_per_patient'] = df['total_visits'] / df['total_patients'].replace(0, np.nan)
            
            # Expense ratio
            df['expense_ratio'] = df['total_expenses'] / df['total_revenue'].replace(0, np.nan)
            
            # Revenue per capacity
            df['revenue_per_capacity'] = df['total_revenue'] / df['capacity'].replace(0, np.nan)
            
            # Log transforms for skewed data
            df['log_revenue'] = np.log1p(df['total_revenue'])
            df['log_visits'] = np.log1p(df['total_visits'])
        
        # Select numeric features
        feature_cols = [
            'capacity', 'total_revenue', 'total_expenses', 'net_income',
            'total_visits', 'total_patients', 'revenue_per_visit'
        ]
        
        if include_derived:
            feature_cols += [
                'profit_margin', 'revenue_per_patient', 'visits_per_patient',
                'expense_ratio', 'revenue_per_capacity', 'log_revenue', 'log_visits'
            ]
        
        # Handle missing values
        df[feature_cols] = df[feature_cols].replace([np.inf, -np.inf], np.nan)
        
        # Fill NaN with median (iterative to handle all-NaN columns)
        for col in feature_cols:
            if df[col].isna().all():
                df[col] = 0
            else:
                df[col] = df[col].fillna(df[col].median())
        
        # Final check for any remaining NaN
        df[feature_cols] = df[feature_cols].fillna(0)
        
        X = df[feature_cols].values
        
        # Verify no NaN or inf
        assert not np.any(np.isnan(X)), "NaN values still present"
        assert not np.any(np.isinf(X)), "Inf values still present"
        
        return df, X
    
    def run_isolation_forest(self, contamination: float = 0.1) -> Dict[str, Any]:
        """
        Isolation Forest - Excellent for fraud detection in financial data.
        Fast, scalable, and effective for high-dimensional data.
        """
        print("\n🌲 Running Isolation Forest...")
        
        df, X = self.prepare_features()
        
        # Scale features
        scaler = RobustScaler()
        X_scaled = scaler.fit_transform(X)
        
        # Train Isolation Forest
        clf = IForest(contamination=contamination, random_state=42, n_estimators=200)
        clf.fit(X_scaled)
        
        # Predictions
        y_pred = clf.predict(X_scaled)  # 0 = normal, 1 = anomaly
        scores = clf.decision_scores_
        
        # Add results to dataframe
        df['anomaly'] = y_pred
        df['anomaly_score'] = scores
        
        # Get anomalies
        anomalies = df[df['anomaly'] == 1].sort_values('anomaly_score', ascending=False)
        
        result = {
            'model': 'Isolation Forest',
            'contamination': contamination,
            'total_samples': len(df),
            'anomalies_detected': int((y_pred == 1).sum()),
            'anomaly_rate': float((y_pred == 1).sum() / len(df) * 100),
            'top_anomalies': anomalies[[
                'name', 'county', 'category_name', 'total_revenue', 
                'profit_margin', 'anomaly_score'
            ]].head(20).to_dict('records')
        }
        
        self.models['iforest'] = clf
        self.scalers['iforest'] = scaler
        self.results['iforest'] = result
        
        print(f"  ✓ Detected {result['anomalies_detected']} anomalies ({result['anomaly_rate']:.1f}%)")
        
        return result
    
    def run_lof(self, contamination: float = 0.1) -> Dict[str, Any]:
        """
        Local Outlier Factor - Identifies anomalies with unusual local density.
        Great for finding facilities with suspicious patterns compared to neighbors.
        """
        print("\n🎯 Running Local Outlier Factor (LOF)...")
        
        df, X = self.prepare_features()
        
        # Scale features
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)
        
        # Train LOF
        clf = LOF(contamination=contamination, n_neighbors=20)
        clf.fit(X_scaled)
        
        # Predictions
        y_pred = clf.predict(X_scaled)
        scores = clf.decision_scores_
        
        df['anomaly'] = y_pred
        df['anomaly_score'] = scores
        
        anomalies = df[df['anomaly'] == 1].sort_values('anomaly_score', ascending=False)
        
        result = {
            'model': 'Local Outlier Factor (LOF)',
            'contamination': contamination,
            'total_samples': len(df),
            'anomalies_detected': int((y_pred == 1).sum()),
            'anomaly_rate': float((y_pred == 1).sum() / len(df) * 100),
            'top_anomalies': anomalies[[
                'name', 'county', 'category_name', 'total_revenue',
                'profit_margin', 'anomaly_score'
            ]].head(20).to_dict('records')
        }
        
        self.models['lof'] = clf
        self.scalers['lof'] = scaler
        self.results['lof'] = result
        
        print(f"  ✓ Detected {result['anomalies_detected']} anomalies ({result['anomaly_rate']:.1f}%)")
        
        return result
    
    def run_ecod(self, contamination: float = 0.1) -> Dict[str, Any]:
        """
        ECOD (Empirical Cumulative Distribution) - Unsupervised outlier detection.
        Parameter-free, fast, and interpretable.
        """
        print("\n📊 Running ECOD...")
        
        df, X = self.prepare_features()
        
        # ECOD doesn't require scaling
        clf = ECOD(contamination=contamination)
        clf.fit(X)
        
        y_pred = clf.predict(X)
        scores = clf.decision_scores_
        
        df['anomaly'] = y_pred
        df['anomaly_score'] = scores
        
        anomalies = df[df['anomaly'] == 1].sort_values('anomaly_score', ascending=False)
        
        result = {
            'model': 'ECOD',
            'contamination': contamination,
            'total_samples': len(df),
            'anomalies_detected': int((y_pred == 1).sum()),
            'anomaly_rate': float((y_pred == 1).sum() / len(df) * 100),
            'top_anomalies': anomalies[[
                'name', 'county', 'category_name', 'total_revenue',
                'profit_margin', 'anomaly_score'
            ]].head(20).to_dict('records')
        }
        
        self.models['ecod'] = clf
        self.results['ecod'] = result
        
        print(f"  ✓ Detected {result['anomalies_detected']} anomalies ({result['anomaly_rate']:.1f}%)")
        
        return result
    
    def run_ensemble_voting(self) -> Dict[str, Any]:
        """
        Ensemble method - Combines multiple models via voting.
        A facility is flagged if multiple algorithms agree.
        """
        print("\n🎪 Running Ensemble Voting...")
        
        if not self.results:
            print("  ⚠️  No models trained yet. Run individual models first.")
            return {}
        
        df, X = self.prepare_features()
        
        # Collect predictions from all models
        predictions = []
        scores = []
        
        for model_name in ['iforest', 'lof', 'ecod']:
            if model_name in self.models:
                clf = self.models[model_name]
                
                # Scale if needed
                if model_name in self.scalers:
                    X_scaled = self.scalers[model_name].transform(X)
                    pred = clf.predict(X_scaled)
                    score = clf.decision_scores_
                else:
                    pred = clf.predict(X)
                    score = clf.decision_scores_
                
                predictions.append(pred)
                scores.append(score)
        
        if not predictions:
            return {}
        
        # Voting: anomaly if 2+ models agree
        predictions = np.array(predictions)
        ensemble_pred = (predictions.sum(axis=0) >= 2).astype(int)
        
        # Average scores
        ensemble_scores = np.array(scores).mean(axis=0)
        
        df['anomaly'] = ensemble_pred
        df['anomaly_score'] = ensemble_scores
        df['agreement_count'] = predictions.sum(axis=0)
        
        anomalies = df[df['anomaly'] == 1].sort_values('agreement_count', ascending=False)
        
        result = {
            'model': 'Ensemble Voting',
            'models_used': [k for k in ['iforest', 'lof', 'ecod'] if k in self.models],
            'voting_threshold': 2,
            'total_samples': len(df),
            'anomalies_detected': int(ensemble_pred.sum()),
            'anomaly_rate': float(ensemble_pred.sum() / len(df) * 100),
            'top_anomalies': anomalies[[
                'name', 'county', 'category_name', 'total_revenue',
                'profit_margin', 'anomaly_score', 'agreement_count'
            ]].head(20).to_dict('records')
        }
        
        self.results['ensemble'] = result
        
        print(f"  ✓ Detected {result['anomalies_detected']} anomalies ({result['anomaly_rate']:.1f}%)")
        print(f"  ✓ Using {len(result['models_used'])} models: {', '.join(result['models_used'])}")
        
        return result
    
    def create_pseudo_labels(self, contamination: float = 0.1) -> Tuple[pd.DataFrame, np.ndarray]:
        """
        Create pseudo-labels for semi-supervised learning.
        Uses unsupervised methods to label data for supervised training.
        """
        print("\n🏷️  Creating pseudo-labels for supervised learning...")
        
        df, X = self.prepare_features()
        
        # Use multiple unsupervised methods
        scaler = RobustScaler()
        X_scaled = scaler.fit_transform(X)
        
        # Isolation Forest
        iforest = IForest(contamination=contamination, random_state=42)
        iforest.fit(X_scaled)
        pred_if = iforest.predict(X_scaled)
        
        # LOF
        lof = LOF(contamination=contamination)
        lof.fit(X_scaled)
        pred_lof = lof.predict(X_scaled)
        
        # ECOD
        ecod = ECOD(contamination=contamination)
        ecod.fit(X)
        pred_ecod = ecod.predict(X)
        
        # Pseudo-labels: fraud if 2+ models agree
        y_pseudo = ((pred_if + pred_lof + pred_ecod) >= 2).astype(int)
        
        print(f"  ✓ Created {y_pseudo.sum()} fraud labels, {len(y_pseudo) - y_pseudo.sum()} normal labels")
        print(f"  ✓ Fraud rate: {y_pseudo.sum() / len(y_pseudo) * 100:.1f}%")
        
        return df, X, y_pseudo
    
    def train_xgboost(self, use_smote: bool = True) -> Dict[str, Any]:
        """
        XGBoost Classifier - Gradient boosting for fraud classification.
        Excellent performance on imbalanced healthcare fraud data.
        """
        print("\n🚀 Training XGBoost Classifier...")
        
        df, X, y = self.create_pseudo_labels()
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.3, random_state=42, stratify=y
        )
        
        # Handle imbalance with SMOTE
        if use_smote and y_train.sum() > 5:
            smote = SMOTE(random_state=42)
            X_train, y_train = smote.fit_resample(X_train, y_train)
            print(f"  ✓ Applied SMOTE: {y_train.sum()} fraud, {len(y_train) - y_train.sum()} normal")
        
        # Train XGBoost
        clf = xgb.XGBClassifier(
            n_estimators=200,
            max_depth=6,
            learning_rate=0.1,
            subsample=0.8,
            colsample_bytree=0.8,
            scale_pos_weight=len(y_train) / y_train.sum() if y_train.sum() > 0 else 1,
            random_state=42,
            eval_metric='logloss'
        )
        
        clf.fit(X_train, y_train)
        
        # Predictions
        y_pred = clf.predict(X_test)
        y_proba = clf.predict_proba(X_test)[:, 1]
        
        # Metrics
        from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score
        
        accuracy = accuracy_score(y_test, y_pred)
        precision = precision_score(y_test, y_pred, zero_division=0)
        recall = recall_score(y_test, y_pred, zero_division=0)
        f1 = f1_score(y_test, y_pred, zero_division=0)
        
        # Feature importance
        feature_names = [
            'capacity', 'total_revenue', 'total_expenses', 'net_income',
            'total_visits', 'total_patients', 'revenue_per_visit',
            'profit_margin', 'revenue_per_patient', 'visits_per_patient',
            'expense_ratio', 'revenue_per_capacity', 'log_revenue', 'log_visits'
        ]
        
        importances = clf.feature_importances_
        feature_importance = sorted(
            zip(feature_names, importances),
            key=lambda x: x[1],
            reverse=True
        )[:10]
        
        result = {
            'model': 'XGBoost',
            'train_samples': len(X_train),
            'test_samples': len(X_test),
            'accuracy': float(accuracy),
            'precision': float(precision),
            'recall': float(recall),
            'f1_score': float(f1),
            'feature_importance': [
                {'feature': f, 'importance': float(imp)}
                for f, imp in feature_importance
            ]
        }
        
        self.models['xgboost'] = clf
        self.results['xgboost'] = result
        
        print(f"  ✓ Accuracy: {accuracy:.3f} | Precision: {precision:.3f} | Recall: {recall:.3f} | F1: {f1:.3f}")
        
        return result
    
    def train_lightgbm(self, use_smote: bool = True) -> Dict[str, Any]:
        """
        LightGBM Classifier - Fast gradient boosting.
        Often outperforms XGBoost on large datasets.
        """
        print("\n⚡ Training LightGBM Classifier...")
        
        df, X, y = self.create_pseudo_labels()
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.3, random_state=42, stratify=y
        )
        
        # Handle imbalance
        if use_smote and y_train.sum() > 5:
            smote = SMOTE(random_state=42)
            X_train, y_train = smote.fit_resample(X_train, y_train)
            print(f"  ✓ Applied SMOTE: {y_train.sum()} fraud, {len(y_train) - y_train.sum()} normal")
        
        # Train LightGBM
        clf = lgb.LGBMClassifier(
            n_estimators=200,
            max_depth=6,
            learning_rate=0.1,
            subsample=0.8,
            colsample_bytree=0.8,
            class_weight='balanced',
            random_state=42,
            verbose=-1
        )
        
        clf.fit(X_train, y_train)
        
        # Predictions
        y_pred = clf.predict(X_test)
        y_proba = clf.predict_proba(X_test)[:, 1]
        
        # Metrics
        from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score
        
        accuracy = accuracy_score(y_test, y_pred)
        precision = precision_score(y_test, y_pred, zero_division=0)
        recall = recall_score(y_test, y_pred, zero_division=0)
        f1 = f1_score(y_test, y_pred, zero_division=0)
        
        # Feature importance
        feature_names = [
            'capacity', 'total_revenue', 'total_expenses', 'net_income',
            'total_visits', 'total_patients', 'revenue_per_visit',
            'profit_margin', 'revenue_per_patient', 'visits_per_patient',
            'expense_ratio', 'revenue_per_capacity', 'log_revenue', 'log_visits'
        ]
        
        importances = clf.feature_importances_
        feature_importance = sorted(
            zip(feature_names, importances),
            key=lambda x: x[1],
            reverse=True
        )[:10]
        
        result = {
            'model': 'LightGBM',
            'train_samples': len(X_train),
            'test_samples': len(X_test),
            'accuracy': float(accuracy),
            'precision': float(precision),
            'recall': float(recall),
            'f1_score': float(f1),
            'feature_importance': [
                {'feature': f, 'importance': float(imp)}
                for f, imp in feature_importance
            ]
        }
        
        self.models['lightgbm'] = clf
        self.results['lightgbm'] = result
        
        print(f"  ✓ Accuracy: {accuracy:.3f} | Precision: {precision:.3f} | Recall: {recall:.3f} | F1: {f1:.3f}")
        
        return result
    
    def run_all_models(self, contamination: float = 0.1) -> Dict[str, Any]:
        """Run all fraud detection models and compare results."""
        print("=" * 70)
        print("🤖 ML-POWERED FRAUD DETECTION - COMPREHENSIVE ANALYSIS")
        print("=" * 70)
        
        results = {
            'timestamp': datetime.now().isoformat(),
            'contamination': contamination,
            'models': {}
        }
        
        # Unsupervised models
        results['models']['iforest'] = self.run_isolation_forest(contamination)
        results['models']['lof'] = self.run_lof(contamination)
        results['models']['ecod'] = self.run_ecod(contamination)
        
        # Ensemble
        results['models']['ensemble'] = self.run_ensemble_voting()
        
        # Supervised models
        results['models']['xgboost'] = self.train_xgboost()
        results['models']['lightgbm'] = self.train_lightgbm()
        
        # Summary comparison
        print("\n" + "=" * 70)
        print("📊 MODEL COMPARISON SUMMARY")
        print("=" * 70)
        
        for model_name, model_result in results['models'].items():
            if 'anomalies_detected' in model_result:
                print(f"{model_result['model']:30s} → {model_result['anomalies_detected']:4d} anomalies ({model_result['anomaly_rate']:.1f}%)")
            elif 'f1_score' in model_result:
                print(f"{model_result['model']:30s} → F1: {model_result['f1_score']:.3f} | Precision: {model_result['precision']:.3f} | Recall: {model_result['recall']:.3f}")
        
        print("=" * 70)
        
        return results
    
    def export_results(self, filename: str = "ml_fraud_detection_results.json"):
        """Export all results to JSON file."""
        if not self.results:
            print("⚠️  No results to export. Run models first.")
            return
        
        with open(filename, 'w') as f:
            json.dump(self.results, f, indent=2)
        
        print(f"\n📄 Results exported to: {filename}")
    
    def get_high_risk_facilities(self, top_n: int = 50) -> List[Dict]:
        """Get facilities flagged by multiple models."""
        if 'ensemble' not in self.results:
            print("⚠️  Run ensemble model first")
            return []
        
        ensemble_result = self.results['ensemble']
        return ensemble_result.get('top_anomalies', [])[:top_n]


if __name__ == "__main__":
    print("\n🤖 ML-Powered Fraud Detection System")
    print("Using PyOD, XGBoost, and LightGBM")
    print("")
    
    detector = MLFraudDetector()
    
    # Run all models
    results = detector.run_all_models(contamination=0.1)
    
    # Export results
    detector.export_results()
    
    # Show high-risk facilities
    print("\n🚨 TOP 10 HIGH-RISK FACILITIES (Multiple Models Agreement):")
    high_risk = detector.get_high_risk_facilities(10)
    for i, facility in enumerate(high_risk, 1):
        print(f"  {i}. {facility['name']}")
        print(f"     County: {facility['county']} | Revenue: ${facility['total_revenue']:,.0f}")
        print(f"     Profit Margin: {facility.get('profit_margin', 0)*100:.1f}% | Agreement: {facility.get('agreement_count', 0)} models")
    
    print("\n✅ ML fraud detection complete!")
