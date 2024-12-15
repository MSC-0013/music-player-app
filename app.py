import os
from flask import Flask, render_template, jsonify

app = Flask(__name__)

# Route to load all songs from the songs directory
@app.route('/api/songs', methods=['GET'])
def get_songs():
    songs_dir = os.path.join(app.root_path, 'static/songs')
    songs = []
    for filename in os.listdir(songs_dir):
        if filename.endswith(('.mp3', '.wav')):
            songs.append({
                'title': filename.rsplit('.', 1)[0],  # Filename without extension
                'path': f'/static/songs/{filename}'  # Relative path to the file
            })
    return jsonify(songs)

@app.route('/')
def home():
    return render_template('index.html')  # Serve the HTML frontend

if __name__ == '__main__':
    app.run(debug=True)
