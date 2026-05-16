export function setupEditorCompletions(monaco: any) {
  const Kind = monaco.languages.CompletionItemKind

  function register(lang: string, items: { label: string; kind: any; detail?: string }[]) {
    monaco.languages.registerCompletionItemProvider(lang, {
      provideCompletionItems(model: any, position: any) {
        const word = model.getWordUntilPosition(position)
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        }
        return {
          suggestions: items.map(i => ({
            label: i.label,
            kind: i.kind,
            insertText: i.label,
            detail: i.detail,
            range,
          })),
        }
      },
    })
  }

  // Python
  register('python', [
    ...'print input len range type int float str list dict tuple set bool abs all any bin chr dir divmod enumerate eval exec filter format getattr globals hasattr hash hex id isinstance issubclass iter map max min next oct open ord pow repr reversed round setattr slice sorted staticmethod sum super vars zip'.split(' ').map(m => ({ label: m, kind: Kind.Function, detail: 'builtin' })),
    ...'strip lstrip rstrip split rsplit join replace find rfind index count startswith endswith upper lower title capitalize swapcase isalpha isdigit isalnum isspace encode format_map'.split(' ').map(m => ({ label: m, kind: Kind.Method, detail: 'str' })),
    ...'append extend insert remove pop clear index count sort reverse copy'.split(' ').map(m => ({ label: m, kind: Kind.Method, detail: 'list' })),
    ...'keys values items get pop update setdefault clear copy fromkeys'.split(' ').map(m => ({ label: m, kind: Kind.Method, detail: 'dict' })),
    ...'os.path.join os.path.exists os.path.dirname os.path.basename os.path.abspath os.listdir os.makedirs os.remove os.rename os.getcwd os.environ os.getenv'.split(' ').map(m => ({ label: m, kind: Kind.Method, detail: 'os' })),
    ...'sys.argv sys.exit sys.path sys.stdin sys.stdout sys.stderr sys.platform sys.version'.split(' ').map(m => ({ label: m, kind: Kind.Property, detail: 'sys' })),
    ...'json.dumps json.loads json.dump json.load'.split(' ').map(m => ({ label: m, kind: Kind.Method, detail: 'json' })),
    ...'collections.defaultdict collections.Counter collections.OrderedDict collections.deque collections.namedtuple'.split(' ').map(m => ({ label: m, kind: Kind.Class, detail: 'collections' })),
    ...'itertools.chain itertools.product itertools.permutations itertools.combinations itertools.count itertools.cycle itertools.repeat'.split(' ').map(m => ({ label: m, kind: Kind.Method, detail: 'itertools' })),
    ...'functools.reduce functools.partial functools.lru_cache functools.wraps'.split(' ').map(m => ({ label: m, kind: Kind.Method, detail: 'functools' })),
    ...'Optional Union List Dict Tuple Set Any Callable TypeVar Generic Protocol Literal Final ClassVar'.split(' ').map(m => ({ label: m, kind: Kind.Interface, detail: 'typing' })),
  ])

  // Go
  register('go', [
    ...'fmt.Println fmt.Printf fmt.Sprintf fmt.Fprintf fmt.Errorf fmt.Scanf fmt.Sscanf fmt.Fscanf'.split(' ').map(m => ({ label: m, kind: Kind.Function, detail: 'fmt' })),
    ...'strings.Contains strings.HasPrefix strings.HasSuffix strings.Join strings.Split strings.Replace strings.ToLower strings.ToUpper strings.TrimSpace strings.Trim strings.Index strings.Count strings.Repeat strings.NewReader strings.Builder'.split(' ').map(m => ({ label: m, kind: Kind.Function, detail: 'strings' })),
    ...'strconv.Itoa strconv.Atoi strconv.FormatInt strconv.ParseInt strconv.FormatFloat strconv.ParseFloat strconv.FormatBool strconv.ParseBool'.split(' ').map(m => ({ label: m, kind: Kind.Function, detail: 'strconv' })),
    ...'os.Open os.Create os.ReadFile os.WriteFile os.Remove os.Mkdir os.MkdirAll os.Getenv os.Setenv os.Exit os.Args os.Stdin os.Stdout os.Stderr'.split(' ').map(m => ({ label: m, kind: Kind.Function, detail: 'os' })),
    ...'io.ReadAll io.Copy io.Reader io.Writer io.EOF io.NopCloser'.split(' ').map(m => ({ label: m, kind: Kind.Function, detail: 'io' })),
    ...'http.Get http.Post http.ListenAndServe http.HandleFunc http.NewRequest http.NewServeMux http.StatusOK http.MethodGet http.MethodPost'.split(' ').map(m => ({ label: m, kind: Kind.Function, detail: 'net/http' })),
    ...'json.Marshal json.Unmarshal json.NewEncoder json.NewDecoder json.MarshalIndent'.split(' ').map(m => ({ label: m, kind: Kind.Function, detail: 'encoding/json' })),
    ...'sync.Mutex sync.RWMutex sync.WaitGroup sync.Once sync.Map sync.Pool'.split(' ').map(m => ({ label: m, kind: Kind.Struct, detail: 'sync' })),
    ...'context.Background context.TODO context.WithCancel context.WithTimeout context.WithDeadline context.WithValue'.split(' ').map(m => ({ label: m, kind: Kind.Function, detail: 'context' })),
    ...'errors.New errors.Is errors.As errors.Unwrap errors.Join'.split(' ').map(m => ({ label: m, kind: Kind.Function, detail: 'errors' })),
    ...'log.Println log.Printf log.Fatal log.Fatalf log.Panic log.SetOutput log.SetFlags'.split(' ').map(m => ({ label: m, kind: Kind.Function, detail: 'log' })),
    ...'make len cap append copy delete close panic recover new print println'.split(' ').map(m => ({ label: m, kind: Kind.Function, detail: 'builtin' })),
    ...'sort.Ints sort.Strings sort.Float64s sort.Slice sort.SliceStable sort.Search'.split(' ').map(m => ({ label: m, kind: Kind.Function, detail: 'sort' })),
    ...'time.Now time.Sleep time.Since time.Until time.After time.NewTicker time.NewTimer time.Duration time.Second time.Minute time.Hour'.split(' ').map(m => ({ label: m, kind: Kind.Function, detail: 'time' })),
    ...'filepath.Join filepath.Dir filepath.Base filepath.Ext filepath.Abs filepath.Walk filepath.WalkDir filepath.Glob'.split(' ').map(m => ({ label: m, kind: Kind.Function, detail: 'path/filepath' })),
  ])

  // Rust
  register('rust', [
    ...'println! eprintln! format! vec! panic! assert! assert_eq! assert_ne! todo! unimplemented! dbg! cfg! include! include_str! env! concat! stringify!'.split(' ').map(m => ({ label: m, kind: Kind.Function, detail: 'macro' })),
    ...'String::new String::from String::with_capacity'.split(' ').map(m => ({ label: m, kind: Kind.Function, detail: 'String' })),
    ...'Vec::new Vec::with_capacity Vec::from'.split(' ').map(m => ({ label: m, kind: Kind.Function, detail: 'Vec' })),
    ...'push pop len is_empty contains iter iter_mut into_iter capacity clear insert remove retain sort sort_by reverse extend clone'.split(' ').map(m => ({ label: m, kind: Kind.Method, detail: 'Vec/String' })),
    ...'unwrap unwrap_or unwrap_or_else expect is_some is_none ok err map and_then or_else flatten'.split(' ').map(m => ({ label: m, kind: Kind.Method, detail: 'Option/Result' })),
    ...'HashMap::new HashMap::with_capacity'.split(' ').map(m => ({ label: m, kind: Kind.Function, detail: 'HashMap' })),
    ...'insert get get_mut remove contains_key keys values entry'.split(' ').map(m => ({ label: m, kind: Kind.Method, detail: 'HashMap' })),
    ...'fs::read_to_string fs::write fs::read fs::create_dir fs::create_dir_all fs::remove_file fs::remove_dir fs::metadata fs::read_dir'.split(' ').map(m => ({ label: m, kind: Kind.Function, detail: 'std::fs' })),
    ...'Path::new PathBuf::new PathBuf::from'.split(' ').map(m => ({ label: m, kind: Kind.Function, detail: 'std::path' })),
    ...'io::stdin io::stdout io::BufReader io::BufWriter io::Read io::Write'.split(' ').map(m => ({ label: m, kind: Kind.Function, detail: 'std::io' })),
    ...'thread::spawn thread::sleep thread::current Arc::new Mutex::new RwLock::new'.split(' ').map(m => ({ label: m, kind: Kind.Function, detail: 'std::thread/sync' })),
    ...'Display Debug Clone Copy Default Iterator From Into AsRef Deref Send Sync'.split(' ').map(m => ({ label: m, kind: Kind.Interface, detail: 'trait' })),
  ])

  // Bash
  register('shell', [
    ...'echo printf read export unset local return exit source eval exec set shopt declare typeset readonly shift getopts trap wait jobs fg bg kill cd pushd popd dirs pwd test'.split(' ').map(m => ({ label: m, kind: Kind.Function, detail: 'builtin' })),
    ...'grep sed awk find xargs sort uniq wc cut tr head tail cat tee less more diff patch tar gzip gunzip zip unzip curl wget chmod chown chgrp mkdir rmdir rm cp mv ln touch file stat du df mount umount ps top kill pkill pgrep nohup cron crontab ssh scp rsync git docker kubectl make'.split(' ').map(m => ({ label: m, kind: Kind.Function, detail: 'command' })),
    ...'$HOME $USER $PATH $PWD $SHELL $TERM $EDITOR $LANG $? $$ $! $# $@ $* $0'.split(' ').map(m => ({ label: m, kind: Kind.Variable, detail: 'variable' })),
  ])

  // Java
  register('java', [
    ...'System.out.println System.out.print System.out.printf System.err.println System.exit System.currentTimeMillis System.nanoTime System.getenv System.getProperty System.arraycopy'.split(' ').map(m => ({ label: m, kind: Kind.Method, detail: 'System' })),
    ...'length charAt substring indexOf lastIndexOf contains startsWith endsWith replace replaceAll split trim strip toUpperCase toLowerCase equals equalsIgnoreCase compareTo isEmpty isBlank format valueOf toCharArray matches join repeat'.split(' ').map(m => ({ label: m, kind: Kind.Method, detail: 'String' })),
    ...'ArrayList HashMap HashSet LinkedList TreeMap TreeSet LinkedHashMap PriorityQueue ArrayDeque Collections.sort Collections.reverse Collections.shuffle Collections.unmodifiableList Collections.emptyList'.split(' ').map(m => ({ label: m, kind: Kind.Class, detail: 'java.util' })),
    ...'add remove get set size isEmpty contains containsKey containsValue put putAll keySet values entrySet clear addAll removeAll retainAll iterator stream toArray'.split(' ').map(m => ({ label: m, kind: Kind.Method, detail: 'Collection' })),
    ...'stream filter map flatMap reduce collect forEach sorted distinct limit skip count anyMatch allMatch noneMatch findFirst findAny toList'.split(' ').map(m => ({ label: m, kind: Kind.Method, detail: 'Stream' })),
    ...'Collectors.toList Collectors.toSet Collectors.toMap Collectors.joining Collectors.groupingBy Collectors.counting Collectors.partitioningBy'.split(' ').map(m => ({ label: m, kind: Kind.Method, detail: 'Collectors' })),
    ...'Files.readString Files.writeString Files.readAllLines Files.write Files.exists Files.createFile Files.createDirectory Files.delete Files.copy Files.move Files.list Files.walk Path.of Paths.get'.split(' ').map(m => ({ label: m, kind: Kind.Method, detail: 'java.nio' })),
    ...'Math.abs Math.max Math.min Math.pow Math.sqrt Math.ceil Math.floor Math.round Math.random Math.PI Math.E Math.log Math.log10'.split(' ').map(m => ({ label: m, kind: Kind.Method, detail: 'Math' })),
    ...'Integer.parseInt Integer.valueOf Integer.MAX_VALUE Integer.MIN_VALUE Long.parseLong Double.parseDouble Boolean.parseBoolean'.split(' ').map(m => ({ label: m, kind: Kind.Method, detail: 'wrapper' })),
    ...'Thread.sleep Thread.currentThread Thread.start Thread.join Thread.interrupt'.split(' ').map(m => ({ label: m, kind: Kind.Method, detail: 'Thread' })),
    ...'Optional.of Optional.ofNullable Optional.empty'.split(' ').map(m => ({ label: m, kind: Kind.Method, detail: 'Optional' })),
  ])

  // HTML
  register('html', [
    ...'div span p a img ul ol li h1 h2 h3 h4 h5 h6 table tr td th thead tbody form input button select option textarea label section article nav header footer main aside figure figcaption video audio canvas svg iframe link meta script style'.split(' ').map(m => ({ label: m, kind: Kind.Property, detail: 'element' })),
    ...'class id style src href alt title type name value placeholder disabled checked readonly required action method target rel media content'.split(' ').map(m => ({ label: m, kind: Kind.Property, detail: 'attribute' })),
  ])

  // CSS
  const cssProps = 'display position top right bottom left width height margin padding border background color font-size font-weight font-family text-align line-height overflow z-index opacity visibility cursor transition transform animation flex justify-content align-items align-self flex-direction flex-wrap gap grid grid-template-columns grid-template-rows border-radius box-shadow text-decoration white-space word-break max-width min-width max-height min-height object-fit pointer-events user-select'.split(' ').map(m => ({ label: m, kind: Kind.Property, detail: 'property' }))
  register('css', cssProps)
  register('scss', cssProps)

  // Svelte
  register('svelte', [
    ...'onMount onDestroy beforeUpdate afterUpdate tick createEventDispatcher setContext getContext getAllContexts'.split(' ').map(m => ({ label: m, kind: Kind.Function, detail: 'svelte' })),
    ...'writable readable derived get'.split(' ').map(m => ({ label: m, kind: Kind.Function, detail: 'svelte/store' })),
    ...'fade fly slide scale blur draw crossfade'.split(' ').map(m => ({ label: m, kind: Kind.Function, detail: 'svelte/transition' })),
    ...'tweened spring'.split(' ').map(m => ({ label: m, kind: Kind.Function, detail: 'svelte/motion' })),
    ...'goto invalidate invalidateAll'.split(' ').map(m => ({ label: m, kind: Kind.Function, detail: 'sveltekit' })),
  ])
}
