'use babel';

// notice data is not being loaded from a local json file
// instead we will fetch suggestions from this URL
const API_URL = 'http://127.0.0.1:8080/exist/apps/dsebaseapp/ac/entity-ac.xql?entity=';

class EntityAcProvider {
	constructor() {
		// offer suggestions only when editing plain text or HTML files
		this.selector = '.text.xml, .text.plain', '*';

		// except when editing a comment within an HTML file
		//this.disableForSelector = '.text.html.basic .comment';

		// make these suggestions appear above default suggestions
		this.suggestionPriority = 2;
	}

	getSuggestions(options) {
        const { editor, bufferPosition } = options;
        let prefix = this.getPrefix(editor, bufferPosition);

		// only look for suggestions after 3 characters have been typed
		if (prefix.length > 3 && prefix.startsWith('@')) {
            entity = prefix.slice(0, 3);
            prefix = prefix.slice(3);
            // console.log("ent:" + entity);
			return this.findMatchingSuggestions(prefix, entity);
		}
	}

	getPrefix(editor, bufferPosition) {
		// the prefix normally only includes characters back to the last word break
		// which is problematic if your suggestions include punctuation (like "@")
		// this expands the prefix back until a whitespace character is met
		// you can tweak this logic/regex to suit your needs
		let line = editor.getTextInRange([[bufferPosition.row, 0], bufferPosition]);
		let match = line.match(/\S+$/);
		return match ? match[0] : '';
	}

	findMatchingSuggestions(prefix, entity) {
		// console.log(prefix, entity)
		// using a Promise lets you fetch and return suggestions asynchronously
		// this is useful for hitting an external API without causing Atom to freeze
		return new Promise((resolve) => {
            switch (entity) {
                case '@pl':
                    entype = 'place';
                    break;
                case '@pe':
                    entype = 'person';
                    break;
                case '@or':
                    entype = 'org';
                    break;
                case '@wo':
                    entype = 'work';
                    break;
                default:
                    entype = 'person';
            };
            function createQueryUrl(apisUsage, baseURL, entype, prefix) {
                if (apisUsage) {
                    return baseURL+entype+'/?q='+encodeURI(prefix);
                }
                else {
                    return baseURL+'?query='+encodeURI(prefix)+'&entity='+entype;
                }
            }
            let apisUsage = atom.config.get("atom-entity-linker.apis");
            let baseURL = atom.config.get("atom-entity-linker.setBaseUrl");

            let newUrl = createQueryUrl(apisUsage, baseURL, entype, prefix);
            console.log(newUrl);
			// let newUrl = baseURL+entype+'&query='+encodeURI(prefix);
			// fire off an async request to the external API
			fetch(newUrl)
				.then((response) => {
					// convert raw response data to json
					return response.json();
				})
				.then((json) => {
					// console.log(json);
					// filter json (list of suggestions) to those matching the prefix
					let matchingSuggestions = json.item.filter((suggestion) => {
						// console.log(suggestion.name.startsWith(prefix));
						return suggestion.name.startsWith(prefix);
					});

					// bind a version of inflateSuggestion() that always passes in prefix
					// then run each matching suggestion through the bound inflateSuggestion()
                    newpref = entity+prefix;
                    // console.log('newpref' + newpref);
					let inflateSuggestion = this.inflateSuggestion.bind(this, newpref);
					let inflatedSuggestions = matchingSuggestions.map(inflateSuggestion);

					// resolve the promise to show suggestions
					resolve(inflatedSuggestions);
				})
				.catch((err) => {
					// something went wrong
					console.log(err);
				});
		});
	}

	createSnippet(type, suggestion){
		let snippet = "<rs type='"+type+"' ref='#"+suggestion.id+"'>$1</rs>$2"
		return snippet
	}

	// clones a suggestion object to a new object with some shared additions
	// cloning also fixes an issue where selecting a suggestion won't insert it
	inflateSuggestion(replacementPrefix, suggestion) {
        console.log(entity)
		return {
			displayText: suggestion.name,
			snippet: this.createSnippet(suggestion.type, suggestion),
			description: suggestion.description,
			descriptionMoreURL: suggestion.more,
			replacementPrefix: replacementPrefix, // ensures entire prefix is replaced
			iconHTML: '<i class="icon-comment"></i>',
			//leftLabelHTML:'<h4>hansi4ever</h4>',
			//type: 'snippet',
			rightLabelHTML: suggestion.description // look in /styles/atom-slds.less
		};
	}

	onDidInsertSuggestion(options) {
        console.log(options);
		atom.notifications.addSuccess(options.suggestion.displayText + ' was inserted.');
	}
}
export default new EntityAcProvider();
