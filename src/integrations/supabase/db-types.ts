export type Json = string | number | boolean | null | { [k: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      datasets: {
        Row: {
          id: string;
          name: string;
          uploaded_at: string | null;
          row_count: number | null;
          mets_prevalence: number | null;
          archived: boolean | null;
          status: string | null;
          user_id: string | null;
          is_shared: boolean | null;
        };
        Insert: {
          id?: string;
          name: string;
          uploaded_at?: string | null;
          row_count?: number | null;
          mets_prevalence?: number | null;
          archived?: boolean | null;
          status?: string | null;
          user_id?: string | null;
          is_shared?: boolean | null;
        };
        Update: Partial<Database["public"]["Tables"]["datasets"]["Insert"]>;
      };
      analysis_runs: {
        Row: {
          id: string;
          dataset_id: string;
          name: string | null;
          function_mode: string | null;
          cohort_filter: Json | null;
          method_config: Json | null;
          status: string | null;
          progress: Json | null;
          started_at: string | null;
          finished_at: string | null;
          error_message: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          dataset_id: string;
          name?: string | null;
          function_mode?: string | null;
          cohort_filter?: Json | null;
          method_config?: Json | null;
          status?: string | null;
          progress?: Json | null;
          started_at?: string | null;
          finished_at?: string | null;
          error_message?: string | null;
          created_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["analysis_runs"]["Insert"]>;
      };
      eda_results: {
        Row: {
          id: string;
          run_id: string;
          n: number | null;
          mets_prevalence: number | null;
          mets_prevalence_by_sex: Json | null;
          n_dietary_columns: number | null;
          figure_paths: Json | null;
        };
        Insert: {
          id?: string;
          run_id: string;
          n?: number | null;
          mets_prevalence?: number | null;
          mets_prevalence_by_sex?: Json | null;
          n_dietary_columns?: number | null;
          figure_paths?: Json | null;
        };
        Update: Partial<Database["public"]["Tables"]["eda_results"]["Insert"]>;
      };
      model_results: {
        Row: {
          id: string;
          run_id: string;
          logistic_metrics_train: Json | null;
          logistic_metrics_test: Json | null;
          xgboost_metrics_train: Json | null;
          xgboost_metrics_test: Json | null;
          shap_top_features: Json | null;
          figure_paths: Json | null;
        };
        Insert: {
          id?: string;
          run_id: string;
          logistic_metrics_train?: Json | null;
          logistic_metrics_test?: Json | null;
          xgboost_metrics_train?: Json | null;
          xgboost_metrics_test?: Json | null;
          shap_top_features?: Json | null;
          figure_paths?: Json | null;
        };
        Update: Partial<Database["public"]["Tables"]["model_results"]["Insert"]>;
      };
      cluster_results: {
        Row: {
          id: string;
          run_id: string;
          cluster_summaries: Json | null;
          figure_paths: Json | null;
        };
        Insert: {
          id?: string;
          run_id: string;
          cluster_summaries?: Json | null;
          figure_paths?: Json | null;
        };
        Update: Partial<Database["public"]["Tables"]["cluster_results"]["Insert"]>;
      };
      analysis_predictions: {
        Row: {
          id: string;
          run_id: string;
          subject_id: string;
          predicted_prob: number | null;
          predicted_label: boolean | null;
          actual_label: boolean | null;
          cluster_label: number | null;
        };
        Insert: {
          id?: string;
          run_id: string;
          subject_id: string;
          predicted_prob?: number | null;
          predicted_label?: boolean | null;
          actual_label?: boolean | null;
          cluster_label?: number | null;
        };
        Update: Partial<Database["public"]["Tables"]["analysis_predictions"]["Insert"]>;
      };
    };
    Views: { [k: string]: never };
    Functions: { [k: string]: never };
    Enums: { [k: string]: never };
    CompositeTypes: { [k: string]: never };
  };
}
