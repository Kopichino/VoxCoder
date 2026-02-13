# Start coding here...

class Node:
    def __init__(self, data=None):
        self.data = data
        self.next = None
        self.prev = None

class DoubleLinkedList:
    def __init__(self):
        self.head = None

    def append(self, data):
        if not self.head:
            self.head = Node(data)
        else:
            cur = self.head
            while cur.next:
                cur = cur.next
            new_node = Node(data)
            cur.next = new_node
            new_node.prev = cur

    def prepend(self, data):
        if self.head is None:
            self.head = Node(data)
        else:
            new_node = Node(data)
            self.head.prev = new_node
            new_node.next = self.head
            self.head = new_node

    def print_list(self):
        cur = self.head
        while cur:
            print(cur.data)
            cur = cur.next

    def delete(self, key):
        cur = self.head
        while cur:
            if cur.data == key and cur == self.head:
                if cur.next:
                    self.head = cur.next
                    cur.next.prev = None
                else:
                    self.head = None
                return
            elif cur.data == key:
                if cur.next:
                    cur.prev.next = cur.next
                    cur.next.prev = cur.prev
                else:
                    cur.prev.next = None
                return
            cur = cur.next

    def show_linked_list(self):
        cur = self.head
        while cur:
            print(f"Data: {cur.data}, Next: {cur.next}, Prev: {cur.prev}")
            cur = cur.next

    def show_path(self):
        cur = self.head
        path = []
        while cur:
            path.append(cur.data)
            cur = cur.next
        print("Path:", path)

def hello():
   a = int(12)
   print('hi')

# Implementing Double Link List
dll = DoubleLinkedList()
dll.append(1)
dll.append(2)
dll.append(3)
dll.prepend(0)
dll.print_list()
print("\nLinked List:")
dll.show_linked_list()
print("\nPath:")
dll.show_path()
dll.delete(2)
dll.print_list()
print("\nLinked List:")
dll.show_linked_list()
print("\nPath:")
dll.show_path()

hello()