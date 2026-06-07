const navItems = [
  { label: 'Home', href: '/' },
  { label: 'Categories', href: '/categories' },
  { label: 'Recommended', href: '/recommended' },
  { label: 'Explore Books', href: '/books' },
  { label: 'Blog', href: '/blog' },
]

export default function useNavItems() {
  return navItems
}