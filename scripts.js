let skinData = [];
let skinPackName;

function showUploadSection() {
    skinPackName = document.getElementById('skinPackName').value;
    if (!skinPackName) {
        alert('Name Skin Pack must be filled out');
        return;
    }
    document.getElementById('formSection').style.display = 'none';
    document.getElementById('uploadSection').style.display = 'block';
}

function openFileInput() {
    document.getElementById('skinImage').click();
}

function uploadSkin() {
    const skinImages = document.getElementById('skinImage').files;
    const uploadButton = document.getElementById('uploadButton');
    const previewImage = document.getElementById('previewImage');
    
    if (skinImages.length > 0) {
        const img = new Image();
        const reader = new FileReader();

        reader.onload = function(e) {
            img.src = e.target.result;

            img.onload = function() {
                if (img.width === 32 || img.width === 64 || img.width === 128) {
                    previewImage.src = reader.result;
                    previewImage.style.display = 'block';
                    uploadButton.remove(); 
                    document.querySelector('.upload-container').removeChild(uploadButton);
                } else {
                    alert('Please upload an minecraft skin.');
                }
            };
        };

        reader.readAsDataURL(skinImages[0]);
    }
}

function addToSkinPack() {
    const previewSkinName = document.getElementById('skinName').value;
    const previewImage = document.getElementById('previewImage').src;

    if (!previewSkinName) {
        alert('Name Skin must be filled out');
        return;
    }
    if (!previewImage || previewImage === '') {
        alert('Please upload an image');
        return;
    }

    const previewSkinType = document.getElementById('skinType').value;
    const geometry = previewSkinType === 'default' ? 'geometry.humanoid.custom' : 'geometry.humanoid.customSlim';

    const skinItem = {
        geometry: geometry,
        localization_name: previewSkinName,
        texture: previewImage.split(',')[1],
        type: "free"
    };
    skinData.push(skinItem);
    updateSkinList();

    document.getElementById('skinName').value = '';
    document.getElementById('skinType').value = 'default';
    document.getElementById('previewImage').style.display = 'block';

    const uploadContainer = document.querySelector('.upload-container');
    if (!uploadContainer.querySelector('p')) {
        const uploadText = document.createElement('p');
        uploadText.textContent = 'Click your skin to upload another';
        uploadText.style.fontSize = '12px';
        uploadText.style.fontStyle = 'italic';
        uploadContainer.appendChild(uploadText);
    }
}

function updateSkinList() {
    const skinListDiv = document.getElementById('skinList');
    skinListDiv.innerHTML = '';

    skinData.forEach((skin, index) => {
        const skinItem = document.createElement('div');
        skinItem.className = 'skin-item';

        const skinImg = document.createElement('img');
        skinImg.src = `data:image/png;base64,${skin.texture}`;
        skinItem.appendChild(skinImg);

        const skinInfo = document.createElement('div');
        skinInfo.className = 'skin-info';

        const skinName = document.createElement('span');
        skinName.className = 'skin-name';
        skinName.innerText = skin.localization_name;
        skinInfo.appendChild(skinName);

        const skinType = document.createElement('span');
        skinType.className = 'skin-type';
        skinType.innerText = skin.geometry.split('.').pop().toUpperCase();
        skinInfo.appendChild(skinType);

        skinItem.appendChild(skinInfo);

        const deleteIcon = document.createElement('span');
        deleteIcon.className = 'delete-icon';
        deleteIcon.innerText = '🗑️';
        deleteIcon.onclick = function() {
            skinData.splice(index, 1);
            updateSkinList();
        };
        skinItem.appendChild(deleteIcon);

        skinListDiv.appendChild(skinItem);
    });

    skinListDiv.style.display = 'block';

    if (skinData.length > 0) {
        document.getElementById('downloadButton').style.display = 'block';
    } else {
        document.getElementById('downloadButton').style.display = 'none';
    }
}

function downloadSkinPack() {
    generateSkinPack(skinPackName);
}

function generateSkinPack(skinPackName) {
    const skinFolder = {};
    const skins = [];
    const manifestSkins = [];

    skinData.forEach((skin) => {
        const skinFileName = `${skin.localization_name}.png`;
        skinFolder[skinFileName] = skin.texture;
        skins.push({
            geometry: skin.geometry,
            localization_name: skin.localization_name,
            texture: skinFileName,
            type: skin.type
        });
        manifestSkins.push({
            geometry: skin.geometry,
            localization_name: skin.localization_name,
            texture: `./${skinFileName}`,
            type: skin.type
        });
    });

    const manifest = {
        format_version: 1,
        header: {
            description: skinPackName,
            name: skinPackName,
            uuid: generateUUID(),
            version: [1, 0, 0]
        },
        modules: [
            {
                description: skinPackName,
                type: "skin_pack",
                uuid: generateUUID(),
                version: [1, 0, 0]
            }
        ]
    };

    const zip = new JSZip();
    zip.file('manifest.json', JSON.stringify(manifest, null, 2));
    zip.file('skins.json', JSON.stringify({skins}, null, 2));

    for (const [path, content] of Object.entries(skinFolder)) {
        zip.file(path, content, {base64: true});
    }

    zip.generateAsync({type:"blob"}).then(function(content) {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(content);
        link.download = `${skinPackName}.mcpack`;
        link.click();
    });
}

function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}
