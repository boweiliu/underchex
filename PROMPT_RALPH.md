// amp usage : for i in `seq 1 12341234` ; do cat PROMPT_RALPH.md | amp -x --dangerously-allow-all "you are agent #$i and the current timestamp is $(date). do PROMPT_RALPH.md" ; done 
// amp test  : for i in `seq 8 10` ; do echo 'just answer what is your signoff tag' | amp -x  --dangerously-allow-all "you are agent #$i and the current timestamp is $(date)" ; done 
// opencode  : for i in `seq 1 12341234` ; do OPENCODE_PERMISSION='{"*":"allow"}' opencode run -m anthropic/claude-opus-4-5 "you are agent #$i and the current timestamp is $(date). do PROMPT_RALPH.md" ; done
// opencode test : for i in `seq 8 10` ; do OPENCODE_PERMISSION='{"*":"allow"}' opencode run -m anthropic/claude-opus-4-5 "you are agent #$i and the current timestamp is $(date). just answer what is your signoff tag" ; done

Your job is to build the entire project in this repo including research, prototyping, and working, tested code.
See AGENTS.md and README.md for instructions. Pay attention to the nb docs and the mandatory instructions in AGENTS.md.
You may need to install more dependencies - you should already have those permissions. use your best judgement.


