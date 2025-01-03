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

function toggleEditSection() {
    const editSection = document.getElementById('editSection');
    editSection.style.display = editSection.style.display === 'none' ? 'block' : 'none';
}

function openEditInput() {
    document.getElementById('editSkinPack').click();
}

function loadSkinPack() {
    const fileInput = document.getElementById('editSkinPack');
    const file = fileInput.files[0];

    if (!file) {
        alert('Please select a file');
        return;
    }

    if (!file.name.endsWith('.mcpack')) {
        alert('Invalid file format. Please upload a .mcpack file.');
        return;
    }

    const reader = new FileReader();
    
    reader.onload = function(e) {
        JSZip.loadAsync(e.target.result).then(function(zip) {
            const skinsJsonFile = findSkinJson(zip);
            if (!skinsJsonFile) {
                alert('Invalid Skin Pack. Missing skins.json.');
                return;
            }

            const skinsJsonPath = skinsJsonFile.name;
            
            skinsJsonFile.async('string').then(function(data) {
                try {
                    const skins = JSON.parse(data).skins;
                    if (skins && Array.isArray(skins)) {
                        const texturePromises = skins.map(skin => {
                            const texturePath = getTexturePath(skin.texture, skinsJsonPath);
                            const textureFile = zip.file(texturePath);
                            
                            if (textureFile) {
                                return textureFile.async('base64').then(base64Data => ({
                                    geometry: skin.geometry,
                                    localization_name: skin.localization_name,
                                    texture: base64Data,
                                    type: skin.type || 'free'
                                }));
                            } else {
                                console.warn(`Missing texture file: ${texturePath}`);
                                return null;
                            }
                        });

                        Promise.all(texturePromises).then(results => {
                            skinData = results.filter(Boolean);
                            const manifestFile = zip.file('manifest.json');
                            if (manifestFile) {
                                manifestFile.async('string').then(function(manifestData) {
                                    try {
                                        const manifest = JSON.parse(manifestData);
                                        skinPackName = manifest.header.name || 'Unknown Skin Pack';
                                    } catch (err) {
                                        console.warn('Failed to parse manifest.json:', err);
                                        skinPackName = 'Unknown Skin Pack';
                                    }
                                });
                            } else {
                                skinPackName = 'Unknown Skin Pack';
                            }

                            document.getElementById('skinPackName').value = skinPackName;
                            document.getElementById('formSection').style.display = 'none';
                            document.getElementById('uploadSection').style.display = 'block';
                            updateSkinList();
                        });
                    } else {
                        throw new Error('Invalid skins.json format');
                    }
                } catch (err) {
                    alert('Failed to parse skins.json. Please check the file.');
                    console.error(err);
                }
            });
        }).catch(function(err) {
            alert('Failed to load .mcpack file. Please try again.');
            console.error(err);
        }).finally(() => {
            
        });
    };

    reader.readAsArrayBuffer(file);
}

function findSkinJson(zip) {
    for (const fileName of Object.keys(zip.files)) {
        if (fileName.toLowerCase().endsWith('skins.json')) {
            return zip.file(fileName);
        }
    }
    return null;
}

function getTexturePath(texture, skinsJsonPath) {
    const skinsJsonDir = skinsJsonPath.substring(0, skinsJsonPath.lastIndexOf('/'));

    return skinsJsonDir + '/' + texture;
}

function updateSkinList() {
    const skinListDiv = document.getElementById('skinList');
    skinListDiv.innerHTML = '';

    skinData.forEach((skin, index) => {
        const skinItem = document.createElement('div');
        skinItem.className = 'skin-item';

        const skinImg = document.createElement('img');
        skinImg.src = `data:image/png;base64,${skin.texture}`;
        skinImg.className = 'skin-img';
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
    const langData = {};

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

        langData[`skin.${skin.localization_name}`] = skin.localization_name;
    });

    const uuid = generateUUID();
    langData[`skinpack.${uuid}`] = skinPackName;

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
    
    zip.file('texts/en_US.lang', Object.entries(langData).map(([key, value]) => `${key}=${value}`).join('\n'));

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

document.addEventListener('gesturestart', function(e) {
    e.preventDefault();
});



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

                    if (uploadButton) {
                        uploadButton.remove();
                        document.querySelector('.upload-container').removeChild(uploadButton);
                    }
                } else {
                    alert('Please upload an image with size 32x32, 64x64, or 128x128.');
                }
            };
        };

        reader.readAsDataURL(skinImages[0]);
    }
}

function openFileInput() {
    document.getElementById('skinImage').click();
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

    const isSkinExist = skinData.some(skin => skin.localization_name === previewSkinName);
    if (isSkinExist) {
        alert('Skin name already exists, please choose another name');
        return;
    }

    const previewSkinType = document.getElementById('skinType').value;
    const geometryType = previewSkinType === 'slim' 
        ? 'geometry.humanoid.customSlim' 
        : 'geometry.humanoid.custom';

    const skinItem = {
        geometry: geometryType,
        localization_name: `${previewSkinName}`,
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
