# Local Trained LLM Pipeline (`llm-training/`)

1. Place academy-permitted course materials (`.pdf`, `.txt`, `.md`) in `starter_data/`.
2. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Prepare bilingual instruction-tuning data:
   ```bash
   python prepare_dataset.py
   ```
4. Fine-tune with QLoRA:
   ```bash
   python train_qlora.py --base_model Qwen/Qwen2.5-3B-Instruct --dataset dataset.jsonl
   ```
5. Merge & export to 4-bit GGUF (via `llama.cpp`), update `FROM` in `Modelfile`, and register with Ollama:
   ```bash
   ollama create academy-tutor -f Modelfile
   ollama serve
   ```
6. Start the Express proxy from the repository root:
   ```bash
   npm run proxy
   ```

