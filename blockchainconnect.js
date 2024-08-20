const Web3 = require('web3');
const Event = require('events');
class Events extends Event {
    on(evt, callback) {
        this.removeListener(evt, callback);
        this.addListener(evt, callback);
    }
}
class EthersConnect extends Events {
    #provider;
    constructor() {
        super();
        if (this.ethereum) {
            this.#provider = new ethers.providers.Web3Provider(this.ethereum);
        }
        else {
            return window.alert('Non-Ethereum browser detected. You should consider trying MetaMask!')
        }

    }
    EthContract() {
        let signer = this.#provider.getSigner();
        return new ethers.Contract(this._contract_address, this._abi, signer);
    }
}
class Web3Connect //extends EthersConnect
{
    _provider;
    constructor() {
        //super();
        if (this.ethereum) {
            this._provider = new Web3(this.ethereum);
            this.emit('web3', this._provider);
        }
        else if ((typeof (window) != 'undefined') && window.web3) {
            this._provider = new Web3(window.web3.currentProvider)
            this.emit('web3', this._provider);
        }
        else {
            //return window.alert('Non-Ethereum browser detected. You should consider trying MetaMask!')
        }

    }
    // Used to get common variable ethereum
    get ethereum() { return (typeof (window) != 'undefined') ? window.ethereum : Web3.eth; }

    /*
        @method initliaze new Contract
        @params @abi (required) Contract ABI 
                @address (required) Contract Address
        @returns new Contract object        
    */
    //    web3Provider(){ 
    //         //   console.log(this._seeder,this._seeder_type);
    //                 if(this._seeder_type=='wss')
    //                    this._seeder = new Web3.providers.WebsocketProvider(this._seeder);
    //        return new Web3(this._seeder);
    //     }
    web3Provider(seeder, seederType) {
        //   console.log(this._seeder,this._seeder_type);
        if (seederType == 'wss')
            seeder = new Web3.providers.WebsocketProvider(seeder);
        return new Web3(seeder);
    }
    Contract(abi, address) {
        const web3 = this.web3Provider('wss://polygon-mumbai.g.alchemy.com/v2/fPUlrma8O5ck95GQVHdz84Nwc-fkkfKZ', 'wss');
        return new web3.eth.Contract(abi, address);
    }

    /*
      @method 'deployContract' For deploying new contract on Blockchain through `metamask or other client` 
               when method called it will emit events deploy-started,deploy-inprogress,
               on success deployed-success
               when error occur user can catch error in catch block
      @params @compiledContract (required) Contract complied abi and bytecode in single variable
      @param  @contractArgs (optional) Contract construtor arguments 
      @param  @connectedAddress (optional) wallet address | current connected wallet address 
      @returns (Promise) Deployed contract address in case of success
    */
    async deployContract(compiledContract, contractArgs = [], connectedAddress) {
        try {
            this.emit('deploy-started', true);
            const deployedContract = await new this.web3.eth.Contract(compiledContract.abi);
            let object = compiledContract?.bytecode || compiledContract?.evm?.bytecode?.object || compiledContract?.data?.bytecode?.object;
            let data = object, transactionParameters;
            if (object && !object.startsWith('0x')) {
                data = '0x' + object;
            }
            const deployedContractTx = deployedContract.deploy({
                data: data,
                arguments: contractArgs,
            });

            transactionParameters = {
                from: connectedAddress || this.account.address,
                data: deployedContractTx.encodeABI(),
                //gasPrice: web3.utils.toWei((await web3.eth.getBlock('latest')).baseFeePerGas+'', 'gwei'),
                //gas: gasLimit,
                // value: hex_value,
            };
            this.emit('deploy-inprogress', true);
            return this.sendParams(transactionParameters).then(cont => {
                this.emit('deployed-success', contAddress);
                return cont?.contractAddress;;
            });
        } catch (e) {
            alert(e.message);
            throw e;
        }
    }

    /*
      @method 'sendParams' sendTransaction with parameters on web3 ethereum
               on success deployed-success
               when error occur user can catch error in catch block
      @params @transactionParameters
      @params eg. {
              from: connectedAddress || this.account.address,
              data: deployedContractTx.encodeABI(),
              //gasPrice: web3.utils.toWei((await web3.eth.getBlock('latest')).baseFeePerGas+'', 'gwei'),
              //gas: gasLimit,
              // value: hex_value,
      @returns (Promise) Deployed contract address in case of success
    */
    sendParams(transactionParameters) {
        return this.web3.eth.sendTransaction(transactionParameters).then(res => res).catch(err => {
            throw err;
        })
    }
}

module.exports = class BlockchainConnect extends Web3Connect {

    _account;
    #chainID;
    constructor() {
        super();
        if (this.isConnected)
            Promise.resolve([this.Connect, this.getNetworkChainId]);

    }
    /*
        @method web3 object instance
        @returns web3 object instance      
    */
    get web3() { return this._provider; }
    get ethers() { return new EthersConnect(); }

    /*
        @method isConnected checks wallet connected or not
        @returns (bool) true if wallet connected |  false on not connected     
    */
    get isConnected() { return !!this.activeAddress; }

    /*
        @method returns current active wallet address
        @returns (string) wallet address    
    */
    get activeAddress() { return this.ethereum?.selectedAddress; }

    /*
        @method get wallet address in case multiple address. get address by identifier
          eg. ["walletaddress1","walletaddress2"]
                this.account.address | this.account.zero | this.account.address0  = returns 'walletaddress1'
                this.account.addressFirst | this.account.address1 | this.account.first  = returns 'walletaddress2'
        @returns (string) wallet address    
    */
    get account() {
        return new Proxy(this, {
            get: (target, props) => {
                // console.log(target,props,target['chainID'].decimal);
                if (props in { "addressZero": 0, "address0": 0, "address": 0, "zero": 0 })
                    return Reflect.get(target['_account'] || {}, 0);
                else if ((props in { "addressFirst": 1, "address1": 1, "first": 1 }))
                    return Reflect.get(target['_account'] || {}, 1);
                else if ((props in { "chainID": 1 }))
                    return target['chainID'];
                // else {
                //     return target;
                //   }   
            }
        });
    }

    /*
        @method get wallet active chainID get chainID by identifier
          eg. 97 0x2a
                this.chaiID.decimal return 97
                this.chaiID.hex  return 0x2a
        @returns (hex|int) chainID   
    */
    get chainID() {
        return new Proxy(this, {
            get: (target, props) => {
                // console.log(target,props);
                if (props in { "decimal": 0, })
                    return this.web3.utils.hexToNumber(this.#chainID);
                else if ((props in { "hex": 1 }))
                    return this.web3.utils.numberToHex(this.#chainID);
                // else {
                //     return target;
                //   }   
            }
        });
    }
    // get account() { console.log(this._account); return this._account; }
    // get chainID(){ return this.#chainID; }
    set abi(val) { this._abi = val }
    set ContractAddress(val) { this._contract_address = val }
    set seeder(val) { this._seeder = val }
    set seederType(val) { this._seeder_type = val }

    /*
       @method getAccount try to call wallet connect using ethereum client
           it emit 'connect' event when account connect
       @returns (Array) wallet accounts array   
   */
    async getAccount() {
        let accounts;
        if (this.ethereum) {
            accounts = await this.ethereum.request({ method: 'eth_requestAccounts' });
        }
        else if (window.web3) {
            accounts = await window.web3.eth.requestAccounts();
        }
        else return window.alert('Non-Ethereum browser detected. You should consider trying MetaMask!');

        this._account = accounts;
        this.emit('connect', accounts);
        return accounts;
    }
    accountChanged(accounts) {
        this._account = accounts;
        this.emit('accountsChanged', accounts);
    }
    chainChanged(chain_id) {
        this.#chainID = chain_id;
        this.emit('chainChanged', chain_id);
    }

    /*
        @method Connect call wallet connect and retrive chainID from active client
            and it adds event listener
        @returns (Promise)(Proxy) Object ( with this we can achieve @method account)  
    */
    async Connect() {
        await this.getAccount();
        await this.getNetworkChainId();
        this.ethereum.on('connect', () => this.getAccount());
        this.ethereum.on('disconnect', () => this.disconnectWallet());
        this.ethereum.on('accountsChanged', (accounts) => this.accountChanged(accounts));
        this.ethereum.on('chainChanged', (chaiID) => this.chainChanged(chaiID));
        return this.account;
    }
    /*
        @method retrive active wallet chainID
            and it adds event listener
        @returns (Promise)   
    */
    async getNetworkChainId() {
        return this.#chainID = await window.ethereum.request({ method: 'eth_chainId' });
    }
    disconnectWallet() {
        this.emit('disconnect');
    }
    setAddress(val) {

    }
    getWallet() {
        if (!this.isConnected) return [];
        // console.log(this.chainID,[this.account.account,this.chainID.decimal,this.chainID.hex]);
        return [this.account.account, this.chainID.decimal, this.chainID.hex];
    }
    /*
       @method switchChain  to change network programmatically
       
       @param  (int) chaiID (optional) 
       @returns (Promise)   
   */
    async switchChain(chaiID) {
        return await this.ethereum
            .request({
                method: "wallet_switchEthereumChain",
                params: [{ chainId: this.web3.utils.toHex(chaiID || this.chainID.decimal) }],
            })
            .catch((switchError) => {
                if (switchError.code === 4902) {
                    window.alert("This network is not available in your metamask, please add it")
                }

            });
    }
}