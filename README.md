# CMC Dev API - Homework

## Setup & Run

**1. Create virtual environment**

```bash
python -m venv venv
```

**2. Enter virtual environment**

```bash
.\venv\Scripts\activate
```

**3. Install dependencies**

```bash
pip install -r requirements.txt
```

**4. Run the API** (replace `8080` with your preferred port)

```bash
uvicorn main:app --reload --port <port>
```

The API will be available at `http://localhost:<port>`.
