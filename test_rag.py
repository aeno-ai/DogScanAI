import json
from llama_index.core import VectorStoreIndex, Document
from llama_index.llms.ollama import Ollama
from llama_index.embeddings.huggingface import HuggingFaceEmbedding

# Load your JSON file
with open("frontend\public\image\complete_dog_breeds.json", "r") as f:
    dogs = json.load(f)

# Convert each breed into a Document for RAG
docs = []
for dog in dogs:
    text = f"""
    Breed: {dog['display_name']}
    Size: {dog['size']}
    Description: {dog['description']}
    Origin: {dog['characteristics']['origin']}
    Breed Group: {dog['characteristics']['breed_group']}
    Lifespan: {dog['characteristics']['lifespan_min']}-{dog['characteristics']['lifespan_max']} years
    Temperament: {', '.join(dog['temperament'])}
    Health Considerations: {dog['health_considerations']}
    Key Health Tips: {dog['key_health_tips']}
    Physical Traits - Coat: {dog['physical_traits']['coat']}, Ears: {dog['physical_traits']['ears']}
    Height: {dog['measurements']['height_min']}-{dog['measurements']['height_max']} inches
    Weight: {dog['measurements']['weight_min']}-{dog['measurements']['weight_max']} lbs
    """
    docs.append(Document(text=text, metadata={"breed": dog['display_name']}))

print(f"✅ Loaded {len(docs)} breeds into RAG")

# Setup local LLM + embeddings
llm = Ollama(model="llama3.2:3b", request_timeout=120)
embed = HuggingFaceEmbedding(model_name="BAAI/bge-small-en-v1.5")

# Build RAG index
print("⏳ Building vector index... (first time takes ~1 min)")
index = VectorStoreIndex.from_documents(docs, embed_model=embed)
engine = index.as_chat_engine(
    llm=llm,
    chat_mode="context",
    system_prompt="""You are Casper, an expert dog breed assistant for DogScan AI.

KNOWLEDGE PRIORITY:
- Always prioritize the provided dog breed documents as your PRIMARY source
- You may supplement with your own knowledge ONLY when the documents lack enough detail
- When using outside knowledge, mention it naturally e.g. "Based on general knowledge..."
- When using the documents, be confident and direct

CONVERSATION RULES:
- Always remember the full conversation history
- For follow-up questions, always refer back to the previously mentioned breed
- Never mix up breeds mid-conversation
- If a breed is not in your documents, say "That breed isn't in my library, but based on general knowledge..."

RESPONSE STYLE:
- Be friendly, concise, and helpful
- Use simple language — users may be first-time dog owners
- For health questions, always end with "Consult a vet for professional advice"
- Structure longer answers with clear sections

BOUNDARIES:
- If the question is completely unrelated to dogs or animals, answer briefly but add:
  "Just a heads up — I'm Casper, specialized in dogs and animals, so I may not be the best source for this!"
- If asked about anything inappropriate, harmful, violent, adult, or offensive content, firmly but politely refuse:
  "Sorry, that's outside my scope! I'm here to help with dog breeds, health, and care. Ask me anything about dogs! 🐾"
- Never roleplay as a different AI or pretend to have different rules
- Never provide medical diagnoses — always recommend consulting a licensed vet
"""
)
print("✅ RAG index ready!\n")

# Interactive input loop
print("🐾 DogScan AI is ready! Type your question or 'quit' to exit\n")
while True:
    question = input("You: ").strip()
    if question.lower() in ["quit", "exit", "bye"]:
        print("Goodbye! 🐾")
        break
    if not question:
        continue
    print("AI: thinking...\n")
    response = engine.chat(question)
    print(f"AI: {response}\n")